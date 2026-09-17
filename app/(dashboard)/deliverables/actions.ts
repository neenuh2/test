"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { runAction, type ActionState } from "@/lib/action-result";
import { resolveDueDate } from "@/lib/rules/due-dates";
import { autoFlagStatus } from "@/lib/rules/submissions";
import { recomputeRunCompletion } from "@/lib/services/completion";

const statusEnum = z.enum(["NOT_SUBMITTED", "SUBMITTED", "LATE", "RESUBMIT", "ACCEPTED"]);
const SUBMITTED_LIKE = new Set(["SUBMITTED", "LATE", "ACCEPTED"]);

/**
 * Save all submission rows for one deliverable within a run (spec §6.4).
 * Per participant the form carries `status:<pid>`, `submittedAt:<pid>`,
 * `remarks:<pid>`, `fileUrl:<pid>`. A SUBMITTED item whose submission date is
 * after the due date is auto-flagged LATE. Completion is recomputed after.
 */
export async function saveSubmissions(
  runId: string,
  deliverableId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  return runAction(async () => {
    const admin = await requireAdmin();

    // Resolve the concrete due date for late-flagging.
    const [deliverable, run, override] = await Promise.all([
      prisma.deliverable.findUnique({ where: { id: deliverableId }, select: { dueOffsetDays: true } }),
      prisma.programRun.findUnique({ where: { id: runId }, select: { startDate: true } }),
      prisma.deliverableDueDate.findUnique({
        where: { deliverableId_programRunId: { deliverableId, programRunId: runId } },
        select: { dueDate: true },
      }),
    ]);
    if (!deliverable || !run) return { error: "Deliverable or run not found." };

    const dueDate = resolveDueDate({
      dueOffsetDays: deliverable.dueOffsetDays,
      runStartDate: run.startDate,
      overrideDueDate: override?.dueDate ?? null,
    });

    const now = new Date();
    const participantIds = new Set<string>();
    for (const key of formData.keys()) {
      if (key.startsWith("status:")) participantIds.add(key.slice("status:".length));
    }

    const ops = [];
    for (const pid of participantIds) {
      const parsed = statusEnum.safeParse(formData.get(`status:${pid}`));
      if (!parsed.success) continue;
      const desired = parsed.data;

      const rawDate = String(formData.get(`submittedAt:${pid}`) ?? "").trim();
      let submittedAt: Date | null = rawDate ? new Date(rawDate) : null;
      if (submittedAt && Number.isNaN(submittedAt.getTime())) submittedAt = null;
      // Default a submission date for submitted-like statuses.
      if (!submittedAt && SUBMITTED_LIKE.has(desired)) submittedAt = now;
      // A not-submitted item has no submission date.
      if (desired === "NOT_SUBMITTED") submittedAt = null;

      const status = autoFlagStatus(desired, submittedAt, dueDate);
      const remarks = String(formData.get(`remarks:${pid}`) ?? "").trim() || null;
      const fileUrl = String(formData.get(`fileUrl:${pid}`) ?? "").trim() || null;

      ops.push(
        prisma.submission.upsert({
          where: {
            deliverableId_participantId_programRunId: {
              deliverableId,
              participantId: pid,
              programRunId: runId,
            },
          },
          update: { status, submittedAt, remarks, fileUrl, reviewedByUserId: admin.id, reviewedAt: now },
          create: {
            deliverableId,
            participantId: pid,
            programRunId: runId,
            status,
            submittedAt,
            remarks,
            fileUrl,
            reviewedByUserId: admin.id,
            reviewedAt: now,
          },
        })
      );
    }

    if (ops.length > 0) await prisma.$transaction(ops);

    await audit({
      userId: admin.id,
      action: "UPDATE",
      entity: "Submission",
      entityId: deliverableId,
      meta: { count: ops.length },
    });

    await recomputeRunCompletion(runId);

    revalidatePath(`/deliverables/${runId}`);
    revalidatePath(`/deliverables/${runId}/${deliverableId}`);
    return { ok: true };
  });
}

/** Admin-triggered recompute of completion for a run. */
export async function recomputeCompletion(runId: string): Promise<ActionState> {
  return runAction(async () => {
    await requireAdmin();
    await recomputeRunCompletion(runId);
    revalidatePath(`/deliverables/${runId}`);
    revalidatePath(`/runs/${runId}`);
    return { ok: true };
  });
}
