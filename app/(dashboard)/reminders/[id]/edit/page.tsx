import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { DraftEditForm } from "./draft-edit-form";
import { updateDraft } from "../../actions";

export default async function EditDraftPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") redirect("/reminders");

  const n = await prisma.notificationLog.findUnique({
    where: { id: params.id },
    include: {
      participant: { select: { firstName: true, lastName: true, email: true } },
    },
  });
  if (!n) notFound();
  if (n.status !== "DRAFT") redirect("/reminders");

  return (
    <div className="space-y-4">
      <PageHeader title="Edit reminder draft" backHref="/reminders" />
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Badge variant="secondary">{n.type.replace("_", " ")}</Badge>
        <span>
          To: {n.participant.firstName} {n.participant.lastName} ({n.participant.email})
        </span>
        <span>· Scheduled {formatDate(n.scheduledFor)}</span>
      </div>
      <DraftEditForm action={updateDraft.bind(null, n.id)} subject={n.subject} body={n.body} />
    </div>
  );
}
