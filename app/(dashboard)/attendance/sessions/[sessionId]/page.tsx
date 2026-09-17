import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { moduleAppliesToCohort } from "@/lib/rules/attendance";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { AttendanceGrid } from "./attendance-grid";
import { saveAttendance } from "../../actions";

export default async function SessionAttendancePage({
  params,
}: {
  params: { sessionId: string };
}) {
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";

  const sess = await prisma.session.findUnique({
    where: { id: params.sessionId },
    include: {
      module: { include: { moduleCohorts: { select: { cohortId: true } } } },
      programRun: { include: { program: { select: { code: true, name: true } } } },
      attendances: { select: { participantId: true, status: true } },
    },
  });
  if (!sess) notFound();

  const scopedCohortIds = sess.module.moduleCohorts.map((mc) => mc.cohortId);

  // Enrolled participants applicable to this session's module.
  const enrollments = await prisma.enrollment.findMany({
    where: { programRunId: sess.programRunId },
    include: { participant: { include: { cohort: { select: { code: true } } } } },
    orderBy: [
      { participant: { lastName: "asc" } },
      { participant: { firstName: "asc" } },
    ],
  });

  const statusByParticipant = new Map(
    sess.attendances.map((a) => [a.participantId, a.status])
  );

  const participants = enrollments
    .filter((e) => moduleAppliesToCohort(scopedCohortIds, e.participant.cohortId))
    .map((e) => ({
      id: e.participant.id,
      name: `${e.participant.lastName}, ${e.participant.firstName}`,
      cohortCode: e.participant.cohort.code,
      status: (statusByParticipant.get(e.participant.id) ?? "ABSENT") as
        | "PRESENT"
        | "LATE"
        | "EXCUSED"
        | "ABSENT",
    }));

  return (
    <div className="space-y-4">
      <PageHeader
        title={sess.module.title}
        description={`${sess.programRun.program.code} — ${sess.programRun.name} · ${formatDate(sess.sessionDate)}`}
        backHref={`/attendance/${sess.programRunId}`}
      />

      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Badge variant="secondary">{sess.mode}</Badge>
        {sess.startTime && sess.endTime && (
          <span>
            {sess.startTime}–{sess.endTime}
          </span>
        )}
        {sess.location && <span>· {sess.location}</span>}
        {sess.trainerName && <span>· Trainer: {sess.trainerName}</span>}
        {scopedCohortIds.length > 0 && (
          <Badge variant="warning">Cohort-scoped module</Badge>
        )}
      </div>

      <AttendanceGrid
        action={saveAttendance.bind(null, sess.id)}
        participants={participants}
        readOnly={!isAdmin}
      />
    </div>
  );
}
