import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { ParticipantForm } from "../participant-form";
import { createParticipant } from "../actions";

export default async function NewParticipantPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") redirect("/participants");

  const cohorts = await prisma.cohort.findMany({ orderBy: { code: "asc" } });

  return (
    <div className="space-y-4">
      <PageHeader title="New participant" backHref="/participants" />
      <ParticipantForm action={createParticipant} cohorts={cohorts} />
    </div>
  );
}
