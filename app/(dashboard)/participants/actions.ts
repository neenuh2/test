"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { runAction, type ActionState } from "@/lib/action-result";
import { participantSchema } from "@/lib/validators/participant";

export async function createParticipant(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  let newId: string | null = null;
  const result = await runAction(async () => {
    const admin = await requireAdmin();
    const data = participantSchema.parse(Object.fromEntries(formData));
    const p = await prisma.participant.create({ data });
    newId = p.id;
    await audit({ userId: admin.id, action: "CREATE", entity: "Participant", entityId: p.id });
    revalidatePath("/participants");
  });
  if (result.ok && newId) redirect(`/participants/${newId}`);
  return result;
}

export async function updateParticipant(
  id: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const result = await runAction(async () => {
    const admin = await requireAdmin();
    const data = participantSchema.parse(Object.fromEntries(formData));
    await prisma.participant.update({ where: { id }, data });
    await audit({ userId: admin.id, action: "UPDATE", entity: "Participant", entityId: id });
    revalidatePath("/participants");
    revalidatePath(`/participants/${id}`);
  });
  if (result.ok) redirect(`/participants/${id}`);
  return result;
}

export async function deleteParticipant(id: string): Promise<ActionState> {
  const result = await runAction(async () => {
    const admin = await requireAdmin();
    await prisma.participant.delete({ where: { id } });
    await audit({ userId: admin.id, action: "DELETE", entity: "Participant", entityId: id });
    revalidatePath("/participants");
  });
  if (result.ok) redirect("/participants");
  return result;
}
