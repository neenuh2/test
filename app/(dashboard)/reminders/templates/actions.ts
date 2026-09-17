"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { runAction, type ActionState } from "@/lib/action-result";

const schema = z.object({
  type: z.enum(["UPCOMING", "DUE_TODAY", "OVERDUE"]),
  subject: z.string().trim().min(1, "Subject is required"),
  body: z.string().trim().min(1, "Body is required"),
});

export async function saveTemplate(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  return runAction(async () => {
    const admin = await requireAdmin();
    const { type, subject, body } = schema.parse(Object.fromEntries(formData));
    await prisma.emailTemplate.upsert({
      where: { type },
      update: { subject, body },
      create: { type, subject, body },
    });
    await audit({ userId: admin.id, action: "UPDATE", entity: "EmailTemplate", entityId: type });
    revalidatePath("/reminders/templates");
    return { ok: true };
  });
}
