import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate, formatPercent } from "@/lib/format";
import { resolveDueDate } from "@/lib/rules/due-dates";
import { moduleAppliesToCohort, computeAttendanceStats } from "@/lib/rules/attendance";
import {
  effectiveSubmissionState,
  isSubmissionSatisfied,
} from "@/lib/rules/submissions";
import { getSettings } from "@/lib/settings";
import { PageHeader } from "@/components/page-header";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { ActionButton } from "@/components/action-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AttendanceStatus } from "@prisma/client";
import { recomputeCompletion } from "../actions";

const STATE_VARIANT: Record<string, BadgeProps["variant"]> = {
  ACCEPTED: "success",
  SUBMITTED: "success",
  LATE: "warning",
  RESUBMIT: "warning",
  NOT_SUBMITTED: "muted",
  OVERDUE: "destructive",
};

function rateVariant(rate: number) {
  if (rate >= 0.8) return "success" as const;
  if (rate >= 0.6) return "warning" as const;
  return "destructive" as const;
}

export default async function RunDeliverablesPage({
  params,
}: {
  params: { runId: string };
}) {
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";
  const { completionAttendanceThreshold: threshold } = await getSettings();
  const now = new Date();

  const run = await prisma.programRun.findUnique({
    where: { id: params.runId },
    include: {
      program: {
        select: {
          code: true,
          name: true,
          deliverables: {
            orderBy: { createdAt: "asc" },
            include: { module: { select: { title: true, moduleCohorts: { select: { cohortId: true } } } } },
          },
        },
      },
      sessions: {
        select: { id: true, module: { select: { moduleCohorts: { select: { cohortId: true } } } } },
      },
      enrollments: {
        include: { participant: { include: { cohort: { select: { code: true } } } } },
        orderBy: [{ participant: { lastName: "asc" } }, { participant: { firstName: "asc" } }],
      },
      deliverableDueDates: true,
    },
  });
  if (!run) notFound();

  const [attendances, submissions] = await Promise.all([
    prisma.attendance.findMany({
      where: { session: { programRunId: run.id } },
      select: { sessionId: true, participantId: true, status: true },
    }),
    prisma.submission.findMany({
      where: { programRunId: run.id },
      select: { deliverableId: true, participantId: true, status: true },
    }),
  ]);

  const attMap = new Map<string, AttendanceStatus>(
    attendances.map((a) => [`${a.sessionId}:${a.participantId}`, a.status])
  );
  const subMap = new Map(submissions.map((s) => [`${s.deliverableId}:${s.participantId}`, s.status]));
  const dueByDeliverable = new Map(run.deliverableDueDates.map((d) => [d.deliverableId, d.dueDate]));

  const deliverableApplies = (
    d: (typeof run.program.deliverables)[number],
    cohortId: string
  ) => {
    if (!d.moduleId) return true;
    const scoped = d.module?.moduleCohorts.map((mc) => mc.cohortId) ?? [];
    return moduleAppliesToCohort(scoped, cohortId);
  };

  // --- Per-deliverable status breakdown ---
  const deliverableRows = run.program.deliverables.map((d) => {
    const dueDate = resolveDueDate({
      dueOffsetDays: d.dueOffsetDays,
      runStartDate: run.startDate,
      overrideDueDate: dueByDeliverable.get(d.id) ?? null,
    });
    const counts: Record<string, number> = {
      ACCEPTED: 0,
      SUBMITTED: 0,
      LATE: 0,
      RESUBMIT: 0,
      NOT_SUBMITTED: 0,
      OVERDUE: 0,
    };
    let applicable = 0;
    for (const e of run.enrollments) {
      if (!deliverableApplies(d, e.participant.cohortId)) continue;
      applicable++;
      const status = subMap.get(`${d.id}:${e.participant.id}`) ?? "NOT_SUBMITTED";
      const eff = effectiveSubmissionState(status, dueDate, now);
      counts[eff] = (counts[eff] ?? 0) + 1;
    }
    return { d, dueDate, counts, applicable, override: dueByDeliverable.has(d.id) };
  });

  // --- Per-participant completion ---
  const participantRows = run.enrollments.map((e) => {
    const cohortId = e.participant.cohortId;
    const applicableSessionIds = run.sessions
      .filter((s) => moduleAppliesToCohort(s.module.moduleCohorts.map((mc) => mc.cohortId), cohortId))
      .map((s) => s.id);
    const perStatus = new Map<string, AttendanceStatus>();
    for (const sid of applicableSessionIds) {
      const st = attMap.get(`${sid}:${e.participant.id}`);
      if (st) perStatus.set(sid, st);
    }
    const stats = computeAttendanceStats({ applicableSessionIds, statusBySession: perStatus });

    const required = run.program.deliverables.filter(
      (d) => d.isRequired && deliverableApplies(d, cohortId)
    );
    const satisfied = required.filter((d) =>
      isSubmissionSatisfied(subMap.get(`${d.id}:${e.participant.id}`) ?? "NOT_SUBMITTED")
    ).length;

    return {
      enrollment: e,
      rate: stats.rate,
      satisfied,
      requiredCount: required.length,
      status: e.completionStatus,
    };
  });

  // --- Completion % by cohort ---
  const cohortAgg = new Map<string, { completed: number; total: number }>();
  for (const e of run.enrollments) {
    const code = e.participant.cohort.code;
    const agg = cohortAgg.get(code) ?? { completed: 0, total: 0 };
    agg.total++;
    if (e.completionStatus === "COMPLETED") agg.completed++;
    cohortAgg.set(code, agg);
  }
  const cohortRows = [...cohortAgg.entries()]
    .map(([code, a]) => ({ code, completed: a.completed, total: a.total, rate: a.total > 0 ? a.completed / a.total : 0 }))
    .sort((x, y) => x.code.localeCompare(y.code));

  const totalEnrolled = run.enrollments.length;
  const totalCompleted = run.enrollments.filter((e) => e.completionStatus === "COMPLETED").length;
  const overallRate = totalEnrolled > 0 ? totalCompleted / totalEnrolled : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Deliverables & completion — ${run.name}`}
        description={`${run.program.code} — ${run.program.name}`}
        backHref="/deliverables"
      />

      <div className="flex flex-wrap items-center gap-3">
        <Badge variant={rateVariant(overallRate)}>
          {formatPercent(overallRate)} completed ({totalCompleted}/{totalEnrolled})
        </Badge>
        <span className="text-sm text-muted-foreground">
          Threshold: {formatPercent(threshold)} attendance + all required deliverables
        </span>
        {isAdmin && (
          <div className="ml-auto">
            <ActionButton action={recomputeCompletion.bind(null, run.id)} doneLabel="Recomputed">
              Recompute completion
            </ActionButton>
          </div>
        )}
      </div>

      {/* Deliverables */}
      <Card>
        <CardHeader>
          <CardTitle>Deliverables ({run.program.deliverables.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {deliverableRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">This program has no deliverables.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Deliverable</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Status breakdown (applicable)</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deliverableRows.map(({ d, dueDate, counts, applicable, override }) => (
                  <TableRow key={d.id}>
                    <TableCell>
                      <div className="font-medium">{d.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {d.isRequired ? "Required" : "Optional"}
                        {d.module ? ` · ${d.module.title}` : ""}
                      </div>
                    </TableCell>
                    <TableCell>
                      {formatDate(dueDate)}
                      {override && <Badge variant="warning" className="ml-1">override</Badge>}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(["ACCEPTED", "SUBMITTED", "LATE", "RESUBMIT", "OVERDUE", "NOT_SUBMITTED"] as const)
                          .filter((k) => counts[k] > 0)
                          .map((k) => (
                            <Badge key={k} variant={STATE_VARIANT[k]}>
                              {k.replace("_", " ").toLowerCase()}: {counts[k]}
                            </Badge>
                          ))}
                        <span className="self-center text-xs text-muted-foreground">
                          / {applicable} applicable
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/deliverables/${run.id}/${d.id}`}
                        className={buttonVariants({ variant: "outline", size: "sm" })}
                      >
                        {isAdmin ? "Mark" : "View"}
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Completion % by cohort */}
        <Card>
          <CardHeader>
            <CardTitle>Completion % by cohort</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cohort</TableHead>
                  <TableHead className="text-right">Completed</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cohortRows.map((c) => (
                  <TableRow key={c.code}>
                    <TableCell>
                      <Badge variant="secondary">{c.code}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {c.completed}/{c.total}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={rateVariant(c.rate)}>{formatPercent(c.rate)}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Per-participant completion */}
        <Card>
          <CardHeader>
            <CardTitle>Participant completion</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Participant</TableHead>
                  <TableHead className="text-right">Attendance</TableHead>
                  <TableHead className="text-right">Required</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {participantRows.map((r) => (
                  <TableRow key={r.enrollment.id}>
                    <TableCell>
                      <Link
                        href={`/participants/${r.enrollment.participant.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {r.enrollment.participant.lastName}, {r.enrollment.participant.firstName}
                      </Link>{" "}
                      <span className="text-xs text-muted-foreground">
                        {r.enrollment.participant.cohort.code}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={rateVariant(r.rate)}>{formatPercent(r.rate)}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {r.satisfied}/{r.requiredCount}
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.status === "COMPLETED" ? "success" : r.status === "DROPPED" ? "destructive" : "muted"}>
                        {r.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
