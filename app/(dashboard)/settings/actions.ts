"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { runAction, type ActionState } from "@/lib/action-result";
import { setSetting, SETTING_KEYS } from "@/lib/settings";

const settingsSchema = z.object({
  // Accept 0..100 (percent) from the UI and store as a 0..1 fraction.
  completionAttendanceThresholdPercent: z.coerce
    .number()
    .min(0, "Must be between 0 and 100")
    .max(100, "Must be between 0 and 100"),
});

export async function updateCompletionSettings(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  return runAction(async () => {
    const admin = await requireAdmin();
    const { completionAttendanceThresholdPercent } = settingsSchema.parse(
      Object.fromEntries(formData)
    );
    const fraction = (completionAttendanceThresholdPercent / 100).toFixed(4);
    await setSetting(SETTING_KEYS.completionAttendanceThreshold, fraction);
    await audit({
      userId: admin.id,
      action: "UPDATE",
      entity: "Setting",
      entityId: SETTING_KEYS.completionAttendanceThreshold,
    });
    revalidatePath("/settings");
    return { ok: true };
  });
}

const reminderSchema = z.object({
  reminderUpcomingOffsets: z
    .string()
    .trim()
    .regex(/^\s*\d+(\s*,\s*\d+)*\s*$/, "Comma-separated day numbers, e.g. 3,1"),
  reminderOverdueIntervalDays: z.coerce.number().int().min(1, "Must be ≥ 1"),
  reminderOverdueMaxCount: z.coerce.number().int().min(0, "Must be ≥ 0"),
  emailAutoSend: z
    .preprocess((v) => v === "on" || v === "true" || v === true, z.boolean())
    .default(false),
});

export async function updateReminderSettings(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  return runAction(async () => {
    const admin = await requireAdmin();
    const parsed = reminderSchema.parse(Object.fromEntries(formData));
    // Normalize offsets to a clean comma list.
    const offsets = parsed.reminderUpcomingOffsets
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .join(",");

    await Promise.all([
      setSetting(SETTING_KEYS.reminderUpcomingOffsets, offsets),
      setSetting(SETTING_KEYS.reminderOverdueIntervalDays, String(parsed.reminderOverdueIntervalDays)),
      setSetting(SETTING_KEYS.reminderOverdueMaxCount, String(parsed.reminderOverdueMaxCount)),
      setSetting(SETTING_KEYS.emailAutoSend, parsed.emailAutoSend ? "true" : "false"),
    ]);
    await audit({ userId: admin.id, action: "UPDATE", entity: "Setting", entityId: "reminders" });
    revalidatePath("/settings");
    return { ok: true };
  });
}
