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

// Deliverables landing: pick a program run to review submissions & completion.
export default async function DeliverablesPage() {
  const runs = await prisma.programRun.findMany({
    orderBy: { startDate: "desc" },
    include: {
      program: { select: { code: true, name: true, _count: { select: { deliverables: true } } } },
      _count: { select: { enrollments: true } },
    },
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Deliverables & completion"
        description="Choose a program run to mark submissions and review completion."
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
                <TableHead className="text-right">Deliverables</TableHead>
                <TableHead className="text-right">Enrolled</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <Link href={`/deliverables/${r.id}`} className="font-medium text-primary hover:underline">
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
                  <TableCell className="text-right">{r.program._count.deliverables}</TableCell>
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
