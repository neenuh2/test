import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { DeliverableForm } from "../../deliverable-form";
import { updateDeliverable } from "../../../../actions";

export default async function EditDeliverablePage({
  params,
}: {
  params: { id: string; deliverableId: string };
}) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") redirect(`/programs/${params.id}`);

  const [deliverable, modules] = await Promise.all([
    prisma.deliverable.findUnique({ where: { id: params.deliverableId } }),
    prisma.module.findMany({
      where: { programId: params.id },
      orderBy: { sequence: "asc" },
      select: { id: true, title: true },
    }),
  ]);
  if (!deliverable || deliverable.programId !== params.id) notFound();

  return (
    <div className="space-y-4">
      <PageHeader title={`Edit deliverable: ${deliverable.title}`} backHref={`/programs/${params.id}`} />
      <DeliverableForm
        action={updateDeliverable.bind(null, params.id, deliverable.id)}
        modules={modules}
        defaults={{
          title: deliverable.title,
          description: deliverable.description,
          moduleId: deliverable.moduleId,
          dueOffsetDays: deliverable.dueOffsetDays,
          weight: deliverable.weight,
          isRequired: deliverable.isRequired,
        }}
      />
    </div>
  );
}
