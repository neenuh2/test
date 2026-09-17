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

const STATUS_VARIANT = {
  DRAFT: "muted",
  ACTIVE: "success",
  ARCHIVED: "secondary",
} as const;

export default async function ProgramsPage() {
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";

  const programs = await prisma.program.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { modules: true, runs: true, deliverables: true } },
    },
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Programs"
        description="Training programs, their modules, and deliverables."
        action={isAdmin ? { href: "/programs/new", label: "New program" } : undefined}
      />

      {programs.length === 0 ? (
        <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          No programs yet.{" "}
          {isAdmin && (
            <Link href="/programs/new" className="text-primary hover:underline">
              Create the first one
            </Link>
          )}
        </p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Modules</TableHead>
                <TableHead className="text-right">Runs</TableHead>
                <TableHead className="text-right">Deliverables</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {programs.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs">{p.code}</TableCell>
                  <TableCell>
                    <Link
                      href={`/programs/${p.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {p.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[p.status]}>{p.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{p._count.modules}</TableCell>
                  <TableCell className="text-right">{p._count.runs}</TableCell>
                  <TableCell className="text-right">
                    {p._count.deliverables}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
