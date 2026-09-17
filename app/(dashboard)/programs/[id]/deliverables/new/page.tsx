import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { DeliverableForm } from "../deliverable-form";
import { createDeliverable } from "../../../actions";

export default async function NewDeliverablePage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") redirect(`/programs/${params.id}`);

  const modules = await prisma.module.findMany({
    where: { programId: params.id },
    orderBy: { sequence: "asc" },
    select: { id: true, title: true },
  });

  return (
    <div className="space-y-4">
      <PageHeader title="Add deliverable" backHref={`/programs/${params.id}`} />
      <DeliverableForm action={createDeliverable.bind(null, params.id)} modules={modules} />
    </div>
  );
}
