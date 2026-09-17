import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { SessionForm } from "../../../session-form";
import { updateSession } from "../../../../actions";

export default async function EditSessionPage({
  params,
}: {
  params: { id: string; sessionId: string };
}) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") redirect(`/runs/${params.id}`);

  const [sess, run] = await Promise.all([
    prisma.session.findUnique({ where: { id: params.sessionId } }),
    prisma.programRun.findUnique({
      where: { id: params.id },
      include: {
        program: {
          include: { modules: { orderBy: { sequence: "asc" }, select: { id: true, title: true } } },
        },
      },
    }),
  ]);
  if (!sess || !run || sess.programRunId !== run.id) notFound();

  return (
    <div className="space-y-4">
      <PageHeader title="Edit session" backHref={`/runs/${run.id}`} />
      <SessionForm
        action={updateSession.bind(null, run.id, sess.id)}
        modules={run.program.modules}
        defaults={{
          moduleId: sess.moduleId,
          sessionDate: sess.sessionDate,
          startTime: sess.startTime,
          endTime: sess.endTime,
          location: sess.location,
          mode: sess.mode,
          trainerName: sess.trainerName,
        }}
      />
    </div>
  );
}
