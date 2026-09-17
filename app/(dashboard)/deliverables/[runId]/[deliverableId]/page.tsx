import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate, formatDateKey } from "@/lib/format";
import { resolveDueDate } from "@/lib/rules/due-dates";
import { moduleAppliesToCohort } from "@/lib/rules/attendance";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { SubmissionGrid } from "./submission-grid";
import { saveSubmissions } from "../../actions";

type SubStatus = "NOT_SUBMITTED" | "SUBMITTED" | "LATE" | "RESUBMIT" | "ACCEPTED";

export default async function SubmissionGridPage({
  params,
}: {
  params: { runId: string; deliverableId: string };
}) {
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";

  const [deliverable, run] = await Promise.all([
    prisma.deliverable.findUnique({
      where: { id: params.deliverableId },
      include: { module: { select: { title: true, moduleCohorts: { select: { cohortId: true } } } } },
    }),
    prisma.programRun.findUnique({
      where: { id: params.runId },
      include: { program: { select: { code: true, name: true } } },
    }),
  ]);
  if (!deliverable || !run || deliverable.programId !== run.programId) notFound();

  const override = await prisma.deliverableDueDate.findUnique({
    where: {
      deliverableId_programRunId: { deliverableId: deliverable.id, programRunId: run.id },
    },
  });
  const dueDate = resolveDueDate({
    dueOffsetDays: deliverable.dueOffsetDays,
    runStartDate: run.startDate,
    overrideDueDate: override?.dueDate ?? null,
  });

  const scoped = deliverable.module?.moduleCohorts.map((mc) => mc.cohortId) ?? [];
  const deliverableIsScoped = Boolean(deliverable.moduleId) && scoped.length > 0;

  const [enrollments, submissions] = await Promise.all([
    prisma.enrollment.findMany({
      where: { programRunId: run.id },
      include: { participant: { include: { cohort: { select: { code: true } } } } },
      orderBy: [{ participant: { lastName: "asc" } }, { participant: { firstName: "asc" } }],
    }),
    prisma.submission.findMany({
      where: { deliverableId: deliverable.id, programRunId: run.id },
    }),
  ]);

  const subByParticipant = new Map(submissions.map((s) => [s.participantId, s]));

  const participants = enrollments
    .filter((e) =>
      deliverable.moduleId ? moduleAppliesToCohort(scoped, e.participant.cohortId) : true
    )
    .map((e) => {
      const sub = subByParticipant.get(e.participant.id);
      return {
        id: e.participant.id,
        name: `${e.participant.lastName}, ${e.participant.firstName}`,
        cohortCode: e.participant.cohort.code,
        status: (sub?.status ?? "NOT_SUBMITTED") as SubStatus,
        submittedAt: sub?.submittedAt ? formatDateKey(sub.submittedAt) : "",
        remarks: sub?.remarks ?? "",
        fileUrl: sub?.fileUrl ?? "",
      };
    });

  return (
    <div className="space-y-4">
      <PageHeader
        title={deliverable.title}
        description={`${run.program.code} — ${run.name}`}
        backHref={`/deliverables/${run.id}`}
      />

      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Badge variant={deliverable.isRequired ? "default" : "muted"}>
          {deliverable.isRequired ? "Required" : "Optional"}
        </Badge>
        <span>Due: {formatDate(dueDate)}</span>
        {override && <Badge variant="warning">override</Badge>}
        {deliverableIsScoped && (
          <Badge variant="secondary">Module: {deliverable.module?.title}</Badge>
        )}
      </div>

      <SubmissionGrid
        action={saveSubmissions.bind(null, run.id, deliverable.id)}
        participants={participants}
        readOnly={!isAdmin}
      />
    </div>
  );
}
