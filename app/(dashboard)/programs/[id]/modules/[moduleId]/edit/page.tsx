import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { ModuleForm } from "../../module-form";
import { updateModule } from "../../../../actions";

export default async function EditModulePage({
  params,
}: {
  params: { id: string; moduleId: string };
}) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") redirect(`/programs/${params.id}`);

  const [module, cohorts] = await Promise.all([
    prisma.module.findUnique({
      where: { id: params.moduleId },
      include: { moduleCohorts: true },
    }),
    prisma.cohort.findMany({ orderBy: { code: "asc" } }),
  ]);
  if (!module || module.programId !== params.id) notFound();

  return (
    <div className="space-y-4">
      <PageHeader title={`Edit module: ${module.title}`} backHref={`/programs/${params.id}`} />
      <ModuleForm
        action={updateModule.bind(null, params.id, module.id)}
        cohorts={cohorts}
        defaults={{
          title: module.title,
          description: module.description,
          cohortIds: module.moduleCohorts.map((mc) => mc.cohortId),
        }}
      />
    </div>
  );
}
