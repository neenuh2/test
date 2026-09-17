import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { SessionForm } from "../../session-form";
import { createSession } from "../../../actions";

export default async function NewSessionPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") redirect(`/runs/${params.id}`);

  const run = await prisma.programRun.findUnique({
    where: { id: params.id },
    include: {
      program: { include: { modules: { orderBy: { sequence: "asc" }, select: { id: true, title: true } } } },
    },
  });
  if (!run) notFound();

  return (
    <div className="space-y-4">
      <PageHeader title="Add session" backHref={`/runs/${run.id}`} />
      <SessionForm action={createSession.bind(null, run.id)} modules={run.program.modules} />
    </div>
  );
}
