import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { ModuleForm } from "../module-form";
import { createModule } from "../../../actions";

export default async function NewModulePage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") redirect(`/programs/${params.id}`);

  const cohorts = await prisma.cohort.findMany({ orderBy: { code: "asc" } });

  return (
    <div className="space-y-4">
      <PageHeader title="Add module" backHref={`/programs/${params.id}`} />
      <ModuleForm action={createModule.bind(null, params.id)} cohorts={cohorts} />
    </div>
  );
}
