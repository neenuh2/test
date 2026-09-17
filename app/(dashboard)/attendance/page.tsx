import Link from "next/link";
import { prisma } from "@/lib/db";
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

// Attendance landing: pick a run to view/mark attendance.
export default async function AttendancePage() {
  const runs = await prisma.programRun.findMany({
    orderBy: { startDate: "desc" },
    include: {
      program: { select: { code: true, name: true } },
      _count: { select: { sessions: true, enrollments: true } },
    },
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Attendance"
        description="Choose a program run to mark and review attendance."
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
                <TableHead>Dates</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Sessions</TableHead>
                <TableHead className="text-right">Enrolled</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <Link href={`/attendance/${r.id}`} className="font-medium text-primary hover:underline">
                      {r.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {r.program.code} — {r.program.name}
                  </TableCell>
                  <TableCell>
                    {formatDate(r.startDate)} → {formatDate(r.endDate)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{r.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{r._count.sessions}</TableCell>
                  <TableCell className="text-right">{r._count.enrollments}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
