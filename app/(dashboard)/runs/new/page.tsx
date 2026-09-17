import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { RunForm } from "../run-form";
import { createRun } from "../actions";

export default async function NewRunPage({
  searchParams,
}: {
  searchParams: { programId?: string };
}) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") redirect("/runs");

  const programs = await prisma.program.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, code: true },
  });

  const programId = searchParams.programId;

  return (
    <div className="space-y-4">
      <PageHeader title="New program run" backHref="/runs" />
      <RunForm
        action={createRun}
        programs={programs}
        defaults={
          programId
            ? { programId, name: "", startDate: "", endDate: "", status: "PLANNED" }
            : undefined
        }
        lockProgram={Boolean(programId)}
      />
    </div>
  );
}
