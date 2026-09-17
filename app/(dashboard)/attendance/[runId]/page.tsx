import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate, formatPercent } from "@/lib/format";
import { computeAttendanceStats, moduleAppliesToCohort } from "@/lib/rules/attendance";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AttendanceStatus } from "@prisma/client";

function rateVariant(rate: number) {
  if (rate >= 0.8) return "success" as const;
  if (rate >= 0.6) return "warning" as const;
  return "destructive" as const;
}

export default async function RunAttendancePage({
  params,
}: {
  params: { runId: string };
}) {
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";

  const run = await prisma.programRun.findUnique({
    where: { id: params.runId },
    include: {
      program: { select: { code: true, name: true } },
      sessions: {
        orderBy: { sessionDate: "asc" },
        include: {
          module: { include: { moduleCohorts: { select: { cohortId: true } } } },
        },
      },
      enrollments: {
        include: { participant: { include: { cohort: { select: { code: true } } } } },
      },
    },
  });
  if (!run) notFound();

  const attendances = await prisma.attendance.findMany({
    where: { session: { programRunId: run.id } },
    select: { sessionId: true, participantId: true, status: true },
  });
  const statusMap = new Map<string, AttendanceStatus>(
    attendances.map((a) => [`${a.sessionId}:${a.participantId}`, a.status])
  );

  const participants = run.enrollments.map((e) => e.participant);

  // --- Per-session status counts (applicable participants only) ---
  const sessionRows = run.sessions.map((s) => {
    const scoped = s.module.moduleCohorts.map((mc) => mc.cohortId);
    const applicable = participants.filter((p) => moduleAppliesToCohort(scoped, p.cohortId));
    const counts = { PRESENT: 0, LATE: 0, EXCUSED: 0, ABSENT: 0, unrecorded: 0 };
    for (const p of applicable) {
      const st = statusMap.get(`${s.id}:${p.id}`);
      if (!st) counts.unrecorded++;
      else counts[st]++;
    }
    return { session: s, applicable: applicable.length, counts };
  });

  // --- Attendance rate by cohort ---
  const cohortAgg = new Map<string, { attended: number; denom: number }>();
  for (const p of participants) {
    const code = p.cohort.code;
    const applicableSessionIds = run.sessions
      .filter((s) => moduleAppliesToCohort(s.module.moduleCohorts.map((mc) => mc.cohortId), p.cohortId))
      .map((s) => s.id);
    const perParticipantStatus = new Map<string, AttendanceStatus>();
    for (const sid of applicableSessionIds) {
      const st = statusMap.get(`${sid}:${p.id}`);
      if (st) perParticipantStatus.set(sid, st);
    }
    const stats = computeAttendanceStats({ applicableSessionIds, statusBySession: perParticipantStatus });
    const agg = cohortAgg.get(code) ?? { attended: 0, denom: 0 };
    agg.attended += stats.attended;
    agg.denom += stats.applicable - stats.excused;
    cohortAgg.set(code, agg);
  }
  const cohortRows = [...cohortAgg.entries()]
    .map(([code, a]) => ({ code, rate: a.denom > 0 ? a.attended / a.denom : 1 }))
    .sort((x, y) => x.code.localeCompare(y.code));

  // --- Attendance rate by module ---
  const moduleIds = [...new Set(run.sessions.map((s) => s.moduleId))];
  const moduleRows = moduleIds.map((moduleId) => {
    const sessionsOfModule = run.sessions.filter((s) => s.moduleId === moduleId);
    const first = sessionsOfModule[0];
    const scoped = first.module.moduleCohorts.map((mc) => mc.cohortId);
    const applicable = participants.filter((p) => moduleAppliesToCohort(scoped, p.cohortId));
    let attended = 0;
    let denom = 0;
    for (const p of applicable) {
      const ids = sessionsOfModule.map((s) => s.id);
      const perStatus = new Map<string, AttendanceStatus>();
      for (const sid of ids) {
        const st = statusMap.get(`${sid}:${p.id}`);
        if (st) perStatus.set(sid, st);
      }
      const stats = computeAttendanceStats({ applicableSessionIds: ids, statusBySession: perStatus });
      attended += stats.attended;
      denom += stats.applicable - stats.excused;
    }
    return { title: first.module.title, rate: denom > 0 ? attended / denom : 1 };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Attendance — ${run.name}`}
        description={`${run.program.code} — ${run.program.name}`}
        backHref="/attendance"
        action={isAdmin ? { href: `/attendance/${run.id}/import`, label: "Import CSV" } : undefined}
      />

      {/* Sessions */}
      <Card>
        <CardHeader>
          <CardTitle>Sessions ({run.sessions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {sessionRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sessions scheduled.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead className="text-right">Present</TableHead>
                  <TableHead className="text-right">Late</TableHead>
                  <TableHead className="text-right">Excused</TableHead>
                  <TableHead className="text-right">Absent</TableHead>
                  <TableHead className="text-right">Unmarked</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessionRows.map(({ session: s, counts }) => (
                  <TableRow key={s.id}>
                    <TableCell>{formatDate(s.sessionDate)}</TableCell>
                    <TableCell className="font-medium">
                      {s.module.title}
                      {s.module.moduleCohorts.length > 0 && (
                        <Badge variant="muted" className="ml-2">scoped</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{counts.PRESENT}</TableCell>
                    <TableCell className="text-right">{counts.LATE}</TableCell>
                    <TableCell className="text-right">{counts.EXCUSED}</TableCell>
                    <TableCell className="text-right">{counts.ABSENT}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {counts.unrecorded}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/attendance/sessions/${s.id}`}
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
        {/* By cohort */}
        <Card>
          <CardHeader>
            <CardTitle>Attendance rate by cohort</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cohort</TableHead>
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
                      <Badge variant={rateVariant(c.rate)}>{formatPercent(c.rate)}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* By module */}
        <Card>
          <CardHeader>
            <CardTitle>Attendance rate by module</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Module</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {moduleRows.map((m) => (
                  <TableRow key={m.title}>
                    <TableCell>{m.title}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={rateVariant(m.rate)}>{formatPercent(m.rate)}</Badge>
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
