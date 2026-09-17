import { CompletionStatus, type AttendanceStatus } from "@prisma/client";

import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { computeAttendanceStats, moduleAppliesToCohort } from "@/lib/rules/attendance";
import { computeCompletion } from "@/lib/rules/completion";
import { isSubmissionSatisfied } from "@/lib/rules/submissions";

/**
 * Recompute and persist COMPLETED / IN_PROGRESS for every enrollment in a run
 * (spec §6.4). DROPPED enrollments are left untouched. Idempotent and safe to
 * re-run — called after attendance/submission changes and nightly (Phase 4).
 *
 * A required deliverable counts against a participant only when it applies to
 * their cohort (program-wide, or a module scoped to include their cohort).
 */
export async function recomputeRunCompletion(runId: string): Promise<{ updated: number }> {
  const { completionAttendanceThreshold: threshold } = await getSettings();

  const run = await prisma.programRun.findUnique({
    where: { id: runId },
    include: {
      sessions: {
        select: { id: true, moduleId: true, module: { select: { moduleCohorts: { select: { cohortId: true } } } } },
      },
      enrollments: {
        select: { id: true, participantId: true, completionStatus: true, participant: { select: { cohortId: true } } },
      },
      program: {
        select: {
          deliverables: {
            where: { isRequired: true },
            select: { id: true, moduleId: true, module: { select: { moduleCohorts: { select: { cohortId: true } } } } },
          },
        },
      },
    },
  });
  if (!run) return { updated: 0 };

  const [attendances, submissions] = await Promise.all([
    prisma.attendance.findMany({
      where: { session: { programRunId: runId } },
      select: { sessionId: true, participantId: true, status: true },
    }),
    prisma.submission.findMany({
      where: { programRunId: runId },
      select: { deliverableId: true, participantId: true, status: true },
    }),
  ]);

  const attStatus = new Map<string, AttendanceStatus>(
    attendances.map((a) => [`${a.sessionId}:${a.participantId}`, a.status])
  );
  const subStatus = new Map(
    submissions.map((s) => [`${s.deliverableId}:${s.participantId}`, s.status])
  );

  const updates: { id: string; status: CompletionStatus }[] = [];

  for (const e of run.enrollments) {
    if (e.completionStatus === CompletionStatus.DROPPED) continue;
    const cohortId = e.participant.cohortId;

    // Applicable sessions → attendance rate.
    const applicableSessionIds = run.sessions
      .filter((s) => moduleAppliesToCohort(s.module.moduleCohorts.map((mc) => mc.cohortId), cohortId))
      .map((s) => s.id);
    const perStatus = new Map<string, AttendanceStatus>();
    for (const sid of applicableSessionIds) {
      const st = attStatus.get(`${sid}:${e.participantId}`);
      if (st) perStatus.set(sid, st);
    }
    const stats = computeAttendanceStats({ applicableSessionIds, statusBySession: perStatus });

    // Applicable required deliverables → satisfied?
    const requiredSatisfied = run.program.deliverables
      .filter((d) => {
        if (!d.moduleId) return true; // program-wide
        const scoped = d.module?.moduleCohorts.map((mc) => mc.cohortId) ?? [];
        return moduleAppliesToCohort(scoped, cohortId);
      })
      .map((d) => isSubmissionSatisfied(subStatus.get(`${d.id}:${e.participantId}`) ?? "NOT_SUBMITTED"));

    const { completed } = computeCompletion({
      attendanceRate: stats.rate,
      threshold,
      requiredSatisfied,
    });

    const newStatus = completed ? CompletionStatus.COMPLETED : CompletionStatus.IN_PROGRESS;
    if (newStatus !== e.completionStatus) updates.push({ id: e.id, status: newStatus });
  }

  if (updates.length > 0) {
    await prisma.$transaction(
      updates.map((u) =>
        prisma.enrollment.update({
          where: { id: u.id },
          data: {
            completionStatus: u.status,
            completedAt: u.status === CompletionStatus.COMPLETED ? new Date() : null,
          },
        })
      )
    );
  }

  return { updated: updates.length };
}

/** Recompute completion for the run that contains a given enrollment. */
export async function recomputeCompletionForEnrollment(enrollmentId: string): Promise<void> {
  const e = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    select: { programRunId: true },
  });
  if (e) await recomputeRunCompletion(e.programRunId);
}
