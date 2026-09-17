import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateKey } from "@/lib/format";
import { moduleAppliesToCohort } from "@/lib/rules/attendance";
import { toCsv } from "@/lib/csv";
import { PageHeader } from "@/components/page-header";
import { ImportClient } from "./import-client";

export default async function AttendanceImportPage({
  params,
}: {
  params: { runId: string };
}) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") redirect(`/attendance/${params.runId}`);

  const run = await prisma.programRun.findUnique({
    where: { id: params.runId },
    include: {
      program: { select: { code: true, name: true } },
      sessions: {
        orderBy: { sessionDate: "asc" },
        include: { module: { select: { title: true, moduleCohorts: { select: { cohortId: true } } } } },
      },
      enrollments: {
        include: { participant: { select: { employeeId: true, firstName: true, lastName: true, cohortId: true } } },
        orderBy: [{ participant: { lastName: "asc" } }, { participant: { firstName: "asc" } }],
      },
    },
  });
  if (!run) notFound();

  // Pre-fill the template with every applicable participant × session pair.
  const templateRows: Record<string, unknown>[] = [];
  for (const s of run.sessions) {
    const scoped = s.module.moduleCohorts.map((mc) => mc.cohortId);
    for (const e of run.enrollments) {
      const p = e.participant;
      if (!moduleAppliesToCohort(scoped, p.cohortId)) continue;
      templateRows.push({
        employeeId: p.employeeId,
        employeeName: `${p.lastName}, ${p.firstName}`,
        moduleTitle: s.module.title,
        sessionDate: formatDateKey(s.sessionDate),
        status: "",
      });
    }
  }
  const templateCsv = toCsv(
    ["employeeId", "employeeName", "moduleTitle", "sessionDate", "status"],
    templateRows
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title={`Import attendance — ${run.name}`}
        description={`${run.program.code} — ${run.program.name}`}
        backHref={`/attendance/${run.id}`}
      />
      <ImportClient runId={run.id} templateCsv={templateCsv} />
    </div>
  );
}
