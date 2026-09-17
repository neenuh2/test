import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { resolveDueDate } from "@/lib/rules/due-dates";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { DeleteButton } from "@/components/delete-button";
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
import { RowActions } from "../../programs/[id]/row-actions";
import { DueDateForm } from "./due-date-form";
import { deleteRun, deleteSession, setDeliverableDueDate, unenroll } from "../actions";

const MODE_LABEL = { IN_PERSON: "In person", VIRTUAL: "Virtual", HYBRID: "Hybrid" } as const;

export default async function RunDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";

  const run = await prisma.programRun.findUnique({
    where: { id: params.id },
    include: {
      program: {
        include: {
          deliverables: { orderBy: { createdAt: "asc" } },
        },
      },
      sessions: {
        orderBy: { sessionDate: "asc" },
        include: { module: { select: { title: true } } },
      },
      enrollments: {
        orderBy: { enrolledAt: "asc" },
        include: { participant: { include: { cohort: { select: { code: true } } } } },
      },
      deliverableDueDates: true,
    },
  });
  if (!run) notFound();

  const overrideByDeliverable = new Map(
    run.deliverableDueDates.map((d) => [d.deliverableId, d.dueDate])
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={run.name}
        description={`${run.program.code} — ${run.program.name}`}
        backHref="/runs"
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{run.status}</Badge>
        <span className="text-sm text-muted-foreground">
          {formatDate(run.startDate)} → {formatDate(run.endDate)}
        </span>
        <div className="ml-auto flex gap-2">
          <Link
            href={`/attendance/${run.id}`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Attendance
          </Link>
          {isAdmin && (
            <>
              <Link
                href={`/runs/${run.id}/edit`}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Edit run
              </Link>
              <DeleteButton
                action={deleteRun.bind(null, run.id)}
                confirmMessage="Delete this run and its sessions/enrollments?"
                label="Delete run"
              />
            </>
          )}
        </div>
      </div>

      {/* Sessions */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Sessions ({run.sessions.length})</CardTitle>
          {isAdmin && (
            <Link href={`/runs/${run.id}/sessions/new`} className={buttonVariants({ size: "sm" })}>
              Add session
            </Link>
          )}
        </CardHeader>
        <CardContent>
          {run.sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sessions scheduled.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Trainer</TableHead>
                  {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {run.sessions.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{formatDate(s.sessionDate)}</TableCell>
                    <TableCell className="font-medium">{s.module.title}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {s.startTime && s.endTime ? `${s.startTime}–${s.endTime}` : "—"}
                    </TableCell>
                    <TableCell>{MODE_LABEL[s.mode]}</TableCell>
                    <TableCell className="text-muted-foreground">{s.trainerName ?? "—"}</TableCell>
                    {isAdmin && (
                      <TableCell>
                        <RowActions
                          editHref={`/runs/${run.id}/sessions/${s.id}/edit`}
                          del={deleteSession.bind(null, run.id, s.id)}
                          confirmMessage="Delete this session and its attendance records?"
                        />
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Enrollments */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Enrolled participants ({run.enrollments.length})</CardTitle>
          {isAdmin && (
            <Link href={`/runs/${run.id}/enroll`} className={buttonVariants({ size: "sm" })}>
              Enroll participants
            </Link>
          )}
        </CardHeader>
        <CardContent>
          {run.enrollments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No one enrolled yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Participant</TableHead>
                  <TableHead>Cohort</TableHead>
                  <TableHead>Completion</TableHead>
                  {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {run.enrollments.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>
                      <Link
                        href={`/participants/${e.participant.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {e.participant.lastName}, {e.participant.firstName}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{e.participant.cohort.code}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={e.completionStatus === "COMPLETED" ? "success" : "muted"}
                      >
                        {e.completionStatus}
                      </Badge>
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <DeleteButton
                          action={unenroll.bind(null, run.id, e.id)}
                          confirmMessage="Remove this participant from the run?"
                          label="Remove"
                        />
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Deliverable due dates for this run */}
      <Card>
        <CardHeader>
          <CardTitle>Deliverable due dates</CardTitle>
        </CardHeader>
        <CardContent>
          {run.program.deliverables.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              This program has no deliverables.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Deliverable</TableHead>
                  <TableHead>Offset</TableHead>
                  <TableHead>Resolved due date</TableHead>
                  {isAdmin && <TableHead>Override for this run</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {run.program.deliverables.map((d) => {
                  const override = overrideByDeliverable.get(d.id) ?? null;
                  const resolved = resolveDueDate({
                    dueOffsetDays: d.dueOffsetDays,
                    runStartDate: run.startDate,
                    overrideDueDate: override,
                  });
                  return (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{d.title}</TableCell>
                      <TableCell>
                        {d.dueOffsetDays == null ? "—" : `+${d.dueOffsetDays}d`}
                      </TableCell>
                      <TableCell>
                        {formatDate(resolved)}
                        {override && (
                          <Badge variant="warning" className="ml-2">
                            override
                          </Badge>
                        )}
                      </TableCell>
                      {isAdmin && (
                        <TableCell>
                          <DueDateForm
                            action={setDeliverableDueDate.bind(null, run.id, d.id)}
                            current={override}
                          />
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
