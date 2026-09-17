import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { EnrollForm } from "./enroll-form";
import { enrollParticipants } from "../../actions";

export default async function EnrollPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") redirect(`/runs/${params.id}`);

  const run = await prisma.programRun.findUnique({ where: { id: params.id } });
  if (!run) notFound();

  // Active participants not already enrolled in this run.
  const participants = await prisma.participant.findMany({
    where: { isActive: true, enrollments: { none: { programRunId: run.id } } },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    include: { cohort: { select: { code: true } } },
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title={`Enroll participants — ${run.name}`}
        description="Select participants to enroll in this run."
        backHref={`/runs/${run.id}`}
      />
      <EnrollForm
        action={enrollParticipants.bind(null, run.id)}
        participants={participants.map((p) => ({
          id: p.id,
          firstName: p.firstName,
          lastName: p.lastName,
          employeeId: p.employeeId,
          cohortCode: p.cohort.code,
        }))}
      />
    </div>
  );
}
