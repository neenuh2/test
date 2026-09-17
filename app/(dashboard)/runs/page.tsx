import Link from "next/link";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { formatDate } from "@/lib/format";
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

export default async function RunsPage() {
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";

  const runs = await prisma.programRun.findMany({
    orderBy: { startDate: "desc" },
    include: {
      program: { select: { code: true, name: true } },
      _count: { select: { enrollments: true, sessions: true } },
    },
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Program runs"
        description="Scheduled offerings (batches) of each program."
        action={isAdmin ? { href: "/runs/new", label: "New run" } : undefined}
      />

      {runs.length === 0 ? (
        <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          No program runs yet.
        </p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Run</TableHead>
                <TableHead>Program</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Enrolled</TableHead>
                <TableHead className="text-right">Sessions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <Link href={`/runs/${r.id}`} className="font-medium text-primary hover:underline">
                      {r.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {r.program.code} — {r.program.name}
                  </TableCell>
                  <TableCell>{formatDate(r.startDate)}</TableCell>
                  <TableCell>{formatDate(r.endDate)}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{r.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{r._count.enrollments}</TableCell>
                  <TableCell className="text-right">{r._count.sessions}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
