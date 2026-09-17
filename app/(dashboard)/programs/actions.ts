"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { runAction, type ActionState } from "@/lib/action-result";
import {
  deliverableSchema,
  moduleSchema,
  programSchema,
} from "@/lib/validators/program";

// --------------------------------------------------------------------------
// Programs
// --------------------------------------------------------------------------

export async function createProgram(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  let newId: string | null = null;
  const result = await runAction(async () => {
    const admin = await requireAdmin();
    const data = programSchema.parse(Object.fromEntries(formData));
    const program = await prisma.program.create({ data });
    newId = program.id;
    await audit({ userId: admin.id, action: "CREATE", entity: "Program", entityId: program.id });
    revalidatePath("/programs");
  });
  if (result.ok && newId) redirect(`/programs/${newId}`);
  return result;
}

export async function updateProgram(
  id: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const result = await runAction(async () => {
    const admin = await requireAdmin();
    const data = programSchema.parse(Object.fromEntries(formData));
    await prisma.program.update({ where: { id }, data });
    await audit({ userId: admin.id, action: "UPDATE", entity: "Program", entityId: id });
    revalidatePath("/programs");
    revalidatePath(`/programs/${id}`);
  });
  if (result.ok) redirect(`/programs/${id}`);
  return result;
}

export async function deleteProgram(id: string): Promise<ActionState> {
  const result = await runAction(async () => {
    const admin = await requireAdmin();
    await prisma.program.delete({ where: { id } });
    await audit({ userId: admin.id, action: "DELETE", entity: "Program", entityId: id });
    revalidatePath("/programs");
  });
  if (result.ok) redirect("/programs");
  return result;
}

// --------------------------------------------------------------------------
// Modules (nested under a program)
// --------------------------------------------------------------------------

export async function createModule(
  programId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const result = await runAction(async () => {
    const admin = await requireAdmin();
    const data = moduleSchema.parse({
      title: formData.get("title"),
      description: formData.get("description"),
      cohortIds: formData.getAll("cohortIds"),
    });

    // Next sequence = max + 1.
    const last = await prisma.module.findFirst({
      where: { programId },
      orderBy: { sequence: "desc" },
      select: { sequence: true },
    });
    const sequence = (last?.sequence ?? 0) + 1;

    await prisma.module.create({
      data: {
        programId,
        title: data.title,
        description: data.description,
        sequence,
        moduleCohorts: {
          create: data.cohortIds.map((cohortId) => ({ cohortId })),
        },
      },
    });
    await audit({ userId: admin.id, action: "CREATE", entity: "Module", entityId: programId });
    revalidatePath(`/programs/${programId}`);
  });
  if (result.ok) redirect(`/programs/${programId}`);
  return result;
}

export async function updateModule(
  programId: string,
  moduleId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const result = await runAction(async () => {
    const admin = await requireAdmin();
    const data = moduleSchema.parse({
      title: formData.get("title"),
      description: formData.get("description"),
      cohortIds: formData.getAll("cohortIds"),
    });

    await prisma.$transaction([
      prisma.module.update({
        where: { id: moduleId },
        data: { title: data.title, description: data.description },
      }),
      prisma.moduleCohort.deleteMany({ where: { moduleId } }),
      prisma.moduleCohort.createMany({
        data: data.cohortIds.map((cohortId) => ({ moduleId, cohortId })),
        skipDuplicates: true,
      }),
    ]);
    await audit({ userId: admin.id, action: "UPDATE", entity: "Module", entityId: moduleId });
    revalidatePath(`/programs/${programId}`);
  });
  if (result.ok) redirect(`/programs/${programId}`);
  return result;
}

export async function deleteModule(
  programId: string,
  moduleId: string
): Promise<ActionState> {
  const result = await runAction(async () => {
    const admin = await requireAdmin();
    await prisma.module.delete({ where: { id: moduleId } });
    await audit({ userId: admin.id, action: "DELETE", entity: "Module", entityId: moduleId });
    revalidatePath(`/programs/${programId}`);
  });
  return result;
}

/** Move a module up/down by swapping sequence with its neighbour. */
export async function moveModule(
  programId: string,
  moduleId: string,
  direction: "up" | "down"
): Promise<ActionState> {
  const result = await runAction(async () => {
    await requireAdmin();
    const modules = await prisma.module.findMany({
      where: { programId },
      orderBy: { sequence: "asc" },
      select: { id: true, sequence: true },
    });
    const idx = modules.findIndex((m) => m.id === moduleId);
    if (idx === -1) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= modules.length) return; // at boundary

    const a = modules[idx];
    const b = modules[swapIdx];
    await prisma.$transaction([
      prisma.module.update({ where: { id: a.id }, data: { sequence: b.sequence } }),
      prisma.module.update({ where: { id: b.id }, data: { sequence: a.sequence } }),
    ]);
    revalidatePath(`/programs/${programId}`);
  });
  return result;
}

// --------------------------------------------------------------------------
// Deliverables (nested under a program)
// --------------------------------------------------------------------------

export async function createDeliverable(
  programId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const result = await runAction(async () => {
    const admin = await requireAdmin();
    const data = deliverableSchema.parse(Object.fromEntries(formData));
    await prisma.deliverable.create({ data: { programId, ...data } });
    await audit({ userId: admin.id, action: "CREATE", entity: "Deliverable", entityId: programId });
    revalidatePath(`/programs/${programId}`);
  });
  if (result.ok) redirect(`/programs/${programId}`);
  return result;
}

export async function updateDeliverable(
  programId: string,
  deliverableId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const result = await runAction(async () => {
    const admin = await requireAdmin();
    const data = deliverableSchema.parse(Object.fromEntries(formData));
    await prisma.deliverable.update({ where: { id: deliverableId }, data });
    await audit({ userId: admin.id, action: "UPDATE", entity: "Deliverable", entityId: deliverableId });
    revalidatePath(`/programs/${programId}`);
  });
  if (result.ok) redirect(`/programs/${programId}`);
  return result;
}

export async function deleteDeliverable(
  programId: string,
  deliverableId: string
): Promise<ActionState> {
  const result = await runAction(async () => {
    const admin = await requireAdmin();
    await prisma.deliverable.delete({ where: { id: deliverableId } });
    await audit({ userId: admin.id, action: "DELETE", entity: "Deliverable", entityId: deliverableId });
    revalidatePath(`/programs/${programId}`);
  });
  return result;
}
