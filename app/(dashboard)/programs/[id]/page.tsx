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
import {
  deleteDeliverable,
  deleteModule,
  deleteProgram,
  moveModule,
} from "../actions";
import { ModuleActions, RowActions } from "./row-actions";

export default async function ProgramDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";

  const program = await prisma.program.findUnique({
    where: { id: params.id },
    include: {
      modules: {
        orderBy: { sequence: "asc" },
        include: { moduleCohorts: { include: { cohort: true } } },
      },
      deliverables: {
        orderBy: { createdAt: "asc" },
        include: { module: { select: { title: true } } },
      },
      runs: { orderBy: { startDate: "desc" } },
    },
  });
  if (!program) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title={program.name}
        description={`${program.code}${program.focus ? ` · ${program.focus}` : ""}`}
        backHref="/programs"
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={program.status === "ACTIVE" ? "success" : "secondary"}>
          {program.status}
        </Badge>
        <span className="text-sm text-muted-foreground">
          {program.totalTrainingDays} training day(s)
        </span>
        {program.targetAudience && (
          <span className="text-sm text-muted-foreground">
            · Audience: {program.targetAudience}
          </span>
        )}
        {isAdmin && (
          <div className="ml-auto flex gap-2">
            <Link
              href={`/programs/${program.id}/edit`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Edit program
            </Link>
            <DeleteButton
              action={deleteProgram.bind(null, program.id)}
              confirmMessage="Delete this program and everything under it (modules, runs, sessions, deliverables)?"
              label="Delete program"
            />
          </div>
        )}
      </div>

      {program.description && (
        <p className="max-w-3xl text-sm text-muted-foreground">{program.description}</p>
      )}

      {/* Modules */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Modules ({program.modules.length})</CardTitle>
          {isAdmin && (
            <Link
              href={`/programs/${program.id}/modules/new`}
              className={buttonVariants({ size: "sm" })}
            >
              Add module
            </Link>
          )}
        </CardHeader>
        <CardContent>
          {program.modules.length === 0 ? (
            <p className="text-sm text-muted-foreground">No modules yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Cohort scope</TableHead>
                  {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {program.modules.map((m, i) => (
                  <TableRow key={m.id}>
                    <TableCell className="text-muted-foreground">{m.sequence}</TableCell>
                    <TableCell>
                      <div className="font-medium">{m.title}</div>
                      {m.description && (
                        <div className="text-xs text-muted-foreground">{m.description}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      {m.moduleCohorts.length === 0 ? (
                        <Badge variant="muted">All cohorts</Badge>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {m.moduleCohorts.map((mc) => (
                            <Badge key={mc.cohortId} variant="secondary">
                              {mc.cohort.code}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <ModuleActions
                          editHref={`/programs/${program.id}/modules/${m.id}/edit`}
                          moveUp={moveModule.bind(null, program.id, m.id, "up")}
                          moveDown={moveModule.bind(null, program.id, m.id, "down")}
                          del={deleteModule.bind(null, program.id, m.id)}
                          canMoveUp={i > 0}
                          canMoveDown={i < program.modules.length - 1}
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

      {/* Deliverables */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Deliverables ({program.deliverables.length})</CardTitle>
          {isAdmin && (
            <Link
              href={`/programs/${program.id}/deliverables/new`}
              className={buttonVariants({ size: "sm" })}
            >
              Add deliverable
            </Link>
          )}
        </CardHeader>
        <CardContent>
          {program.deliverables.length === 0 ? (
            <p className="text-sm text-muted-foreground">No deliverables yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Due offset</TableHead>
                  <TableHead>Weight</TableHead>
                  <TableHead>Required</TableHead>
                  {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {program.deliverables.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.title}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {d.module?.title ?? "—"}
                    </TableCell>
                    <TableCell>
                      {d.dueOffsetDays == null ? "—" : `+${d.dueOffsetDays}d`}
                    </TableCell>
                    <TableCell>{d.weight ?? "—"}</TableCell>
                    <TableCell>
                      {d.isRequired ? (
                        <Badge variant="default">Required</Badge>
                      ) : (
                        <Badge variant="muted">Optional</Badge>
                      )}
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <RowActions
                          editHref={`/programs/${program.id}/deliverables/${d.id}/edit`}
                          del={deleteDeliverable.bind(null, program.id, d.id)}
                          confirmMessage="Delete this deliverable and its submissions/due dates?"
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

      {/* Runs */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Program runs ({program.runs.length})</CardTitle>
          {isAdmin && (
            <Link
              href={`/runs/new?programId=${program.id}`}
              className={buttonVariants({ size: "sm" })}
            >
              Add run
            </Link>
          )}
        </CardHeader>
        <CardContent>
          {program.runs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No runs scheduled yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {program.runs.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Link href={`/runs/${r.id}`} className="font-medium text-primary hover:underline">
                        {r.name}
                      </Link>
                    </TableCell>
                    <TableCell>{formatDate(r.startDate)}</TableCell>
                    <TableCell>{formatDate(r.endDate)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{r.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
