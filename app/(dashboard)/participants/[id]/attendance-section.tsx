import { prisma } from "@/lib/db";
import { formatDate, formatPercent } from "@/lib/format";
import {
  computeAttendanceStats,
  computeModulesMissed,
  moduleAppliesToCohort,
} from "@/lib/rules/attendance";
import { Badge, type BadgeProps } from "@/components/ui/badge";
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

const STATUS_VARIANT: Record<AttendanceStatus, BadgeProps["variant"]> = {
  PRESENT: "success",
  LATE: "warning",
  EXCUSED: "secondary",
  ABSENT: "destructive",
};

/**
 * Per-run attendance for one participant: attendance rate, modules missed, and
 * a session-by-session timeline. Only sessions of modules applicable to the
 * participant's cohort are considered.
 */
export async function ParticipantAttendanceSection({
  participantId,
  cohortId,
}: {
  participantId: string;
  cohortId: string;
}) {
  const enrollments = await prisma.enrollment.findMany({
    where: { participantId },
    orderBy: { enrolledAt: "desc" },
    include: {
      programRun: {
        include: {
          program: { select: { code: true, name: true } },
          sessions: {
            orderBy: { sessionDate: "asc" },
            include: {
              module: {
                select: {
                  id: true,
                  title: true,
                  moduleCohorts: { select: { cohortId: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  const attendances = await prisma.attendance.findMany({
    where: { participantId },
    select: { sessionId: true, status: true },
  });
  const statusBySession = new Map<string, AttendanceStatus>(
    attendances.map((a) => [a.sessionId, a.status])
  );

  if (enrollments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Attendance</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Not enrolled in any run.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {enrollments.map((e) => {
        const run = e.programRun;
        const applicableSessions = run.sessions.filter((s) =>
          moduleAppliesToCohort(s.module.moduleCohorts.map((mc) => mc.cohortId), cohortId)
        );
        const applicableSessionIds = applicableSessions.map((s) => s.id);

        const stats = computeAttendanceStats({ applicableSessionIds, statusBySession });

        const moduleSessionIds = new Map<string, string[]>();
        const moduleTitles = new Map<string, string>();
        for (const s of applicableSessions) {
          moduleTitles.set(s.module.id, s.module.title);
          moduleSessionIds.set(s.module.id, [
            ...(moduleSessionIds.get(s.module.id) ?? []),
            s.id,
          ]);
        }
        const missedIds = computeModulesMissed({ moduleSessionIds, statusBySession });

        return (
          <Card key={e.id}>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">
                {run.name}{" "}
                <span className="font-normal text-muted-foreground">
                  · {run.program.code}
                </span>
              </CardTitle>
              <Badge variant={stats.rate >= 0.8 ? "success" : "warning"}>
                {formatPercent(stats.rate)} attendance
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground">
                {stats.attended} attended · {stats.absent} absent · {stats.excused} excused ·{" "}
                {stats.unrecorded} unmarked (of {stats.applicable} applicable sessions)
              </div>

              <div>
                <div className="mb-1 text-sm font-medium">
                  Modules missed ({missedIds.length})
                </div>
                {missedIds.length === 0 ? (
                  <p className="text-sm text-muted-foreground">None — all modules covered.</p>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {missedIds.map((id) => (
                      <Badge key={id} variant="destructive">
                        {moduleTitles.get(id)}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {applicableSessions.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Module</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {applicableSessions.map((s) => {
                      const st = statusBySession.get(s.id);
                      return (
                        <TableRow key={s.id}>
                          <TableCell>{formatDate(s.sessionDate)}</TableCell>
                          <TableCell className="font-medium">{s.module.title}</TableCell>
                          <TableCell>
                            {st ? (
                              <Badge variant={STATUS_VARIANT[st]}>{st}</Badge>
                            ) : (
                              <Badge variant="muted">UNMARKED</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        );
      })}
    </>
  );
}
