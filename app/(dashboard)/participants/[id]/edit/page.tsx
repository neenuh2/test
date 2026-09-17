import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { ParticipantForm } from "../../participant-form";
import { updateParticipant } from "../../actions";

export default async function EditParticipantPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") redirect(`/participants/${params.id}`);

  const [participant, cohorts] = await Promise.all([
    prisma.participant.findUnique({ where: { id: params.id } }),
    prisma.cohort.findMany({ orderBy: { code: "asc" } }),
  ]);
  if (!participant) notFound();

  return (
    <div className="space-y-4">
      <PageHeader
        title={`Edit: ${participant.firstName} ${participant.lastName}`}
        backHref={`/participants/${participant.id}`}
      />
      <ParticipantForm
        action={updateParticipant.bind(null, participant.id)}
        cohorts={cohorts}
        defaults={{
          employeeId: participant.employeeId,
          firstName: participant.firstName,
          lastName: participant.lastName,
          email: participant.email,
          cohortId: participant.cohortId,
          branch: participant.branch,
          region: participant.region,
          isActive: participant.isActive,
        }}
      />
    </div>
  );
}
