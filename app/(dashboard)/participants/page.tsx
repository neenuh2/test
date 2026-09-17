import Link from "next/link";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function ParticipantsPage() {
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";

  const participants = await prisma.participant.findMany({
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    include: {
      cohort: { select: { code: true } },
      _count: { select: { enrollments: true } },
    },
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Participants"
        description="Branch and relationship-banking staff, grouped by cohort."
        action={isAdmin ? { href: "/participants/new", label: "New participant" } : undefined}
      />

      {participants.length === 0 ? (
        <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          No participants yet.
        </p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Employee ID</TableHead>
                <TableHead>Cohort</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Enrollments</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {participants.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <Link
                      href={`/participants/${p.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {p.lastName}, {p.firstName}
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{p.employeeId}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{p.cohort.code}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{p.branch ?? "—"}</TableCell>
                  <TableCell>
                    {p.isActive ? (
                      <Badge variant="success">Active</Badge>
                    ) : (
                      <Badge variant="muted">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{p._count.enrollments}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
