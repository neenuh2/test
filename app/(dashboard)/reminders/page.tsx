import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { ActionButton } from "@/components/action-button";
import { ReminderQueue } from "./reminder-queue";
import { generateNow } from "./actions";
import type { NotificationStatus } from "@prisma/client";

const STATUS_TABS: { value: string; label: string }[] = [
  { value: "DRAFT", label: "Drafts" },
  { value: "SENT", label: "Sent" },
  { value: "FAILED", label: "Failed" },
  { value: "SKIPPED", label: "Skipped" },
  { value: "ALL", label: "All" },
];

export default async function RemindersPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";
  const status = searchParams.status ?? "DRAFT";

  const where =
    status && status !== "ALL" ? { status: status as NotificationStatus } : {};

  const notifications = await prisma.notificationLog.findMany({
    where,
    orderBy: [{ createdAt: "desc" }],
    take: 500,
    include: {
      participant: { select: { firstName: true, lastName: true, email: true } },
      deliverable: { select: { title: true } },
      programRun: { include: { program: { select: { name: true } } } },
    },
  });

  const rows = notifications.map((n) => ({
    id: n.id,
    type: n.type,
    status: n.status,
    participant: `${n.participant.firstName} ${n.participant.lastName}`,
    email: n.participant.email,
    deliverable: n.deliverable.title,
    program: `${n.programRun.program.name} · ${n.programRun.name}`,
    scheduledFor: formatDateTime(n.scheduledFor),
    error: n.error,
  }));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Reminder review queue"
        description="Generated reminder drafts wait here for review, then approve & send."
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1">
          {STATUS_TABS.map((t) => (
            <Link
              key={t.value}
              href={`/reminders?status=${t.value}`}
              className={buttonVariants({
                variant: status === t.value ? "default" : "outline",
                size: "sm",
              })}
            >
              {t.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/reminders/templates"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Templates
          </Link>
          {isAdmin && (
            <ActionButton action={generateNow} variant="default" doneLabel="Scan complete">
              Generate drafts now
            </ActionButton>
          )}
        </div>
      </div>

      <ReminderQueue rows={rows} isAdmin={isAdmin} />
    </div>
  );
}
