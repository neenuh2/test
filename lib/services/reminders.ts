import {
  NotificationStatus,
  type NotificationType,
  type Prisma,
} from "@prisma/client";

import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { formatDate, formatDateKey, APP_TIMEZONE } from "@/lib/format";
import { resolveDueDate } from "@/lib/rules/due-dates";
import { moduleAppliesToCohort } from "@/lib/rules/attendance";
import { isSubmissionSatisfied } from "@/lib/rules/submissions";
import { daysUntilDue, planReminder } from "@/lib/rules/reminders";
import { DEFAULT_TEMPLATES, renderTemplate, type TemplateVars } from "@/lib/email/templates";
import { sendEmail } from "@/lib/email/mailer";

const SUBMISSION_LINK = process.env.APP_PUBLIC_URL ?? process.env.AUTH_URL ?? "";

async function loadTemplates(): Promise<Record<NotificationType, { subject: string; body: string }>> {
  const rows = await prisma.emailTemplate.findMany();
  const byType = new Map(rows.map((r) => [r.type, { subject: r.subject, body: r.body }]));
  return {
    UPCOMING: byType.get("UPCOMING") ?? DEFAULT_TEMPLATES.UPCOMING,
    DUE_TODAY: byType.get("DUE_TODAY") ?? DEFAULT_TEMPLATES.DUE_TODAY,
    OVERDUE: byType.get("OVERDUE") ?? DEFAULT_TEMPLATES.OVERDUE,
  };
}

/**
 * Scan all non-cancelled runs and generate NotificationLog DRAFT reminders for
 * today (spec §6.5). Idempotent: the unique (participant, deliverable, type,
 * dedupeDay) constraint plus a pre-check mean re-running never duplicates or
 * overwrites existing (possibly edited/approved/sent) rows. When auto-send is
 * on, newly created drafts are sent immediately.
 */
export async function generateReminderDrafts(
  now: Date = new Date()
): Promise<{ created: number; sent: number }> {
  const settings = await getSettings();
  const templates = await loadTemplates();
  const todayKey = formatDateKey(now);
  const config = {
    upcomingOffsets: settings.reminderUpcomingOffsets,
    overdueIntervalDays: settings.reminderOverdueIntervalDays,
    overdueMaxCount: settings.reminderOverdueMaxCount,
  };

  const runs = await prisma.programRun.findMany({
    where: { status: { not: "CANCELLED" } },
    include: {
      program: {
        select: {
          name: true,
          deliverables: {
            include: { module: { select: { title: true, moduleCohorts: { select: { cohortId: true } } } } },
          },
        },
      },
      enrollments: {
        include: { participant: { select: { id: true, firstName: true, lastName: true, email: true, cohortId: true } } },
      },
      deliverableDueDates: true,
    },
  });

  // Existing reminder keys for today (avoid overwrites and duplicates).
  const existing = await prisma.notificationLog.findMany({
    where: { dedupeDay: todayKey },
    select: { participantId: true, deliverableId: true, type: true },
  });
  const existingKeys = new Set(existing.map((e) => `${e.participantId}:${e.deliverableId}:${e.type}`));

  // Submissions across all these runs to determine what is still missing.
  const runIds = runs.map((r) => r.id);
  const submissions = runIds.length
    ? await prisma.submission.findMany({
        where: { programRunId: { in: runIds } },
        select: { deliverableId: true, participantId: true, programRunId: true, status: true },
      })
    : [];
  const subStatus = new Map(
    submissions.map((s) => [`${s.programRunId}:${s.deliverableId}:${s.participantId}`, s.status])
  );

  const toCreate: Prisma.NotificationLogCreateManyInput[] = [];

  for (const run of runs) {
    const overrideByDeliverable = new Map(run.deliverableDueDates.map((d) => [d.deliverableId, d.dueDate]));
    for (const d of run.program.deliverables) {
      const dueDate = resolveDueDate({
        dueOffsetDays: d.dueOffsetDays,
        runStartDate: run.startDate,
        overrideDueDate: overrideByDeliverable.get(d.id) ?? null,
      });
      if (!dueDate) continue;

      const dUntil = daysUntilDue(dueDate, now, APP_TIMEZONE);
      const scoped = d.module?.moduleCohorts.map((mc) => mc.cohortId) ?? [];

      for (const e of run.enrollments) {
        const p = e.participant;
        if (d.moduleId && !moduleAppliesToCohort(scoped, p.cohortId)) continue;

        const status = subStatus.get(`${run.id}:${d.id}:${p.id}`) ?? "NOT_SUBMITTED";
        if (isSubmissionSatisfied(status)) continue; // nothing to remind about

        const type = planReminder({ daysUntilDue: dUntil, isRequired: d.isRequired, config });
        if (!type) continue;

        const key = `${p.id}:${d.id}:${type}`;
        if (existingKeys.has(key)) continue;
        existingKeys.add(key);

        const vars: TemplateVars = {
          participantName: `${p.firstName} ${p.lastName}`,
          program: run.program.name,
          module: d.module?.title ?? "—",
          deliverable: d.title,
          dueDate: formatDate(dueDate),
          daysRemaining: dUntil > 0 ? String(dUntil) : "0",
          daysOverdue: dUntil < 0 ? String(-dUntil) : "0",
          submissionLink: SUBMISSION_LINK,
        };
        const tpl = templates[type];

        toCreate.push({
          participantId: p.id,
          deliverableId: d.id,
          programRunId: run.id,
          type,
          status: NotificationStatus.DRAFT,
          scheduledFor: now,
          dedupeDay: todayKey,
          subject: renderTemplate(tpl.subject, vars),
          body: renderTemplate(tpl.body, vars),
        });
      }
    }
  }

  let created = 0;
  if (toCreate.length > 0) {
    const res = await prisma.notificationLog.createMany({ data: toCreate, skipDuplicates: true });
    created = res.count;
  }

  let sent = 0;
  if (settings.emailAutoSend && created > 0) {
    // Auto-send bypasses the review queue: send all pending drafts.
    const drafts = await prisma.notificationLog.findMany({
      where: { status: NotificationStatus.DRAFT },
      select: { id: true },
    });
    for (const draft of drafts) {
      const ok = await sendNotification(draft.id);
      if (ok) sent++;
    }
  }

  return { created, sent };
}

/**
 * Send one notification via SMTP and record the outcome. Idempotent: an
 * already-SENT notification is skipped. Safe to call for resend on FAILED.
 */
export async function sendNotification(id: string): Promise<boolean> {
  const n = await prisma.notificationLog.findUnique({
    where: { id },
    include: { participant: { select: { email: true } } },
  });
  if (!n) return false;
  if (n.status === NotificationStatus.SENT) return true; // never double-send

  try {
    await sendEmail({ to: n.participant.email, subject: n.subject, html: n.body });
    await prisma.notificationLog.update({
      where: { id },
      data: { status: NotificationStatus.SENT, sentAt: new Date(), error: null },
    });
    return true;
  } catch (err) {
    await prisma.notificationLog.update({
      where: { id },
      data: {
        status: NotificationStatus.FAILED,
        error: err instanceof Error ? err.message : String(err),
      },
    });
    return false;
  }
}

/** Approve (record approver) and send a batch of notifications. */
export async function approveAndSend(
  ids: string[],
  userId: string
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;
  for (const id of ids) {
    await prisma.notificationLog.update({
      where: { id },
      data: { status: NotificationStatus.APPROVED, approvedByUserId: userId },
    });
    const ok = await sendNotification(id);
    if (ok) sent++;
    else failed++;
  }
  return { sent, failed };
}
