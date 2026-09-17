import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { RunForm } from "../../run-form";
import { updateRun } from "../../actions";

export default async function EditRunPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") redirect(`/runs/${params.id}`);

  const [run, programs] = await Promise.all([
    prisma.programRun.findUnique({ where: { id: params.id } }),
    prisma.program.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true },
    }),
  ]);
  if (!run) notFound();

  return (
    <div className="space-y-4">
      <PageHeader title={`Edit run: ${run.name}`} backHref={`/runs/${run.id}`} />
      <RunForm
        action={updateRun.bind(null, run.id)}
        programs={programs}
        defaults={{
          programId: run.programId,
          name: run.name,
          startDate: run.startDate,
          endDate: run.endDate,
          status: run.status,
        }}
      />
    </div>
  );
}
