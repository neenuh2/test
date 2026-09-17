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
