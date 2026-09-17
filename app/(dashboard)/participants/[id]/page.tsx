import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";
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
import { deleteParticipant } from "../actions";
import { ParticipantAttendanceSection } from "./attendance-section";

export default async function ParticipantDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";

  const participant = await prisma.participant.findUnique({
    where: { id: params.id },
    include: {
      cohort: true,
      enrollments: {
        orderBy: { enrolledAt: "desc" },
        include: {
          programRun: { include: { program: { select: { code: true, name: true } } } },
        },
      },
    },
  });
  if (!participant) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${participant.firstName} ${participant.lastName}`}
        description={`${participant.employeeId} · ${participant.email}`}
        backHref="/participants"
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{participant.cohort.code}</Badge>
        {participant.isActive ? (
          <Badge variant="success">Active</Badge>
        ) : (
          <Badge variant="muted">Inactive</Badge>
        )}
        {participant.branch && (
          <span className="text-sm text-muted-foreground">Branch: {participant.branch}</span>
        )}
        {participant.region && (
          <span className="text-sm text-muted-foreground">· {participant.region}</span>
        )}
        {isAdmin && (
          <div className="ml-auto flex gap-2">
            <Link
              href={`/participants/${participant.id}/edit`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Edit
            </Link>
            <DeleteButton
              action={deleteParticipant.bind(null, participant.id)}
              confirmMessage="Delete this participant and all their records?"
            />
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Enrollments ({participant.enrollments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {participant.enrollments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Not enrolled in any run.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Run</TableHead>
                  <TableHead>Program</TableHead>
                  <TableHead>Enrolled</TableHead>
                  <TableHead>Completion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {participant.enrollments.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>
                      <Link
                        href={`/runs/${e.programRunId}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {e.programRun.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {e.programRun.program.code} — {e.programRun.program.name}
                    </TableCell>
                    <TableCell>{formatDate(e.enrolledAt)}</TableCell>
                    <TableCell>
                      <Badge variant={e.completionStatus === "COMPLETED" ? "success" : "muted"}>
                        {e.completionStatus}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">Attendance</h2>
        <ParticipantAttendanceSection
          participantId={participant.id}
          cohortId={participant.cohortId}
        />
      </div>
    </div>
  );
}
