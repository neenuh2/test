import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { ProgramForm } from "../program-form";
import { createProgram } from "../actions";

export default async function NewProgramPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") redirect("/programs");

  return (
    <div className="space-y-4">
      <PageHeader title="New program" backHref="/programs" />
      <ProgramForm action={createProgram} />
    </div>
  );
}
