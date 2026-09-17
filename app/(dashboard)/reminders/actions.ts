"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { runAction, type ActionState } from "@/lib/action-result";
import {
  approveAndSend,
  generateReminderDrafts,
  sendNotification,
} from "@/lib/services/reminders";

/** Manually run the daily due-date scan to generate drafts. */
export async function generateNow(): Promise<ActionState> {
  return runAction(async () => {
    const admin = await requireAdmin();
    const { created, sent } = await generateReminderDrafts();
    await audit({ userId: admin.id, action: "CREATE", entity: "NotificationLog", meta: { created, sent } });
    revalidatePath("/reminders");
    return { ok: true };
  });
}

/** Approve & send the selected notifications (batch). */
export async function approveSelected(ids: string[]): Promise<ActionState> {
  return runAction(async () => {
    const admin = await requireAdmin();
    const clean = ids.filter(Boolean);
    if (clean.length === 0) return { error: "Select at least one reminder to send." };
    const { sent, failed } = await approveAndSend(clean, admin.id);
    await audit({ userId: admin.id, action: "UPDATE", entity: "NotificationLog", meta: { sent, failed } });
    revalidatePath("/reminders");
    return { ok: true };
  });
}

/** Send / resend a single notification (also used for resend-on-failure). */
export async function sendOne(id: string): Promise<ActionState> {
  return runAction(async () => {
    const admin = await requireAdmin();
    await prisma.notificationLog.update({
      where: { id },
      data: { approvedByUserId: admin.id },
    });
    const ok = await sendNotification(id);
    revalidatePath("/reminders");
    return ok ? { ok: true } : { error: "Send failed — see the row's error." };
  });
}

/** Skip (cancel) a draft so it won't be sent. */
export async function skipOne(id: string): Promise<ActionState> {
  return runAction(async () => {
    await requireAdmin();
    await prisma.notificationLog.update({ where: { id }, data: { status: "SKIPPED" } });
    revalidatePath("/reminders");
    return { ok: true };
  });
}

const editSchema = z.object({
  subject: z.string().trim().min(1, "Subject is required"),
  body: z.string().trim().min(1, "Body is required"),
});

/** Edit a draft's subject/body before sending. */
export async function updateDraft(
  id: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const result = await runAction(async () => {
    await requireAdmin();
    const data = editSchema.parse(Object.fromEntries(formData));
    // Only DRAFTs are editable.
    const n = await prisma.notificationLog.findUnique({ where: { id }, select: { status: true } });
    if (!n || n.status !== "DRAFT") return { error: "Only draft reminders can be edited." };
    await prisma.notificationLog.update({ where: { id }, data });
    revalidatePath("/reminders");
  });
  if (result.ok) redirect("/reminders");
  return result;
}
