import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { ProgramForm } from "../../program-form";
import { updateProgram } from "../../actions";

export default async function EditProgramPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") redirect(`/programs/${params.id}`);

  const program = await prisma.program.findUnique({ where: { id: params.id } });
  if (!program) notFound();

  return (
    <div className="space-y-4">
      <PageHeader title={`Edit: ${program.name}`} backHref={`/programs/${program.id}`} />
      <ProgramForm action={updateProgram.bind(null, program.id)} program={program} />
    </div>
  );
}
