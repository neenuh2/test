"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { runAction, type ActionState } from "@/lib/action-result";
import { programRunSchema, sessionSchema } from "@/lib/validators/run";
import { deliverableDueDateSchema } from "@/lib/validators/program";
import { enrollSchema } from "@/lib/validators/participant";

// --------------------------------------------------------------------------
// Program runs
// --------------------------------------------------------------------------

export async function createRun(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  let newId: string | null = null;
  const result = await runAction(async () => {
    const admin = await requireAdmin();
    const data = programRunSchema.parse(Object.fromEntries(formData));
    const run = await prisma.programRun.create({ data });
    newId = run.id;
    await audit({ userId: admin.id, action: "CREATE", entity: "ProgramRun", entityId: run.id });
    revalidatePath("/runs");
    revalidatePath(`/programs/${data.programId}`);
  });
  if (result.ok && newId) redirect(`/runs/${newId}`);
  return result;
}

export async function updateRun(
  id: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const result = await runAction(async () => {
    const admin = await requireAdmin();
    const data = programRunSchema.parse(Object.fromEntries(formData));
    await prisma.programRun.update({ where: { id }, data });
    await audit({ userId: admin.id, action: "UPDATE", entity: "ProgramRun", entityId: id });
    revalidatePath(`/runs/${id}`);
    revalidatePath("/runs");
  });
  if (result.ok) redirect(`/runs/${id}`);
  return result;
}

export async function deleteRun(id: string): Promise<ActionState> {
  const result = await runAction(async () => {
    const admin = await requireAdmin();
    await prisma.programRun.delete({ where: { id } });
    await audit({ userId: admin.id, action: "DELETE", entity: "ProgramRun", entityId: id });
    revalidatePath("/runs");
  });
  if (result.ok) redirect("/runs");
  return result;
}

// --------------------------------------------------------------------------
// Sessions (nested under a run)
// --------------------------------------------------------------------------

export async function createSession(
  runId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const result = await runAction(async () => {
    const admin = await requireAdmin();
    const data = sessionSchema.parse(Object.fromEntries(formData));
    await prisma.session.create({ data: { programRunId: runId, ...data } });
    await audit({ userId: admin.id, action: "CREATE", entity: "Session", entityId: runId });
    revalidatePath(`/runs/${runId}`);
  });
  if (result.ok) redirect(`/runs/${runId}`);
  return result;
}

export async function updateSession(
  runId: string,
  sessionId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const result = await runAction(async () => {
    const admin = await requireAdmin();
    const data = sessionSchema.parse(Object.fromEntries(formData));
    await prisma.session.update({ where: { id: sessionId }, data });
    await audit({ userId: admin.id, action: "UPDATE", entity: "Session", entityId: sessionId });
    revalidatePath(`/runs/${runId}`);
  });
  if (result.ok) redirect(`/runs/${runId}`);
  return result;
}

export async function deleteSession(
  runId: string,
  sessionId: string
): Promise<ActionState> {
  return runAction(async () => {
    const admin = await requireAdmin();
    await prisma.session.delete({ where: { id: sessionId } });
    await audit({ userId: admin.id, action: "DELETE", entity: "Session", entityId: sessionId });
    revalidatePath(`/runs/${runId}`);
  });
}

// --------------------------------------------------------------------------
// Enrollments
// --------------------------------------------------------------------------

export async function enrollParticipants(
  runId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const result = await runAction(async () => {
    const admin = await requireAdmin();
    const { participantIds } = enrollSchema.parse({
      programRunId: runId,
      participantIds: formData.getAll("participantIds"),
    });
    await prisma.enrollment.createMany({
      data: participantIds.map((participantId) => ({ participantId, programRunId: runId })),
      skipDuplicates: true,
    });
    await audit({
      userId: admin.id,
      action: "CREATE",
      entity: "Enrollment",
      entityId: runId,
      meta: { count: participantIds.length },
    });
    revalidatePath(`/runs/${runId}`);
    revalidatePath(`/runs/${runId}/enroll`);
  });
  if (result.ok) redirect(`/runs/${runId}`);
  return result;
}

export async function unenroll(
  runId: string,
  enrollmentId: string
): Promise<ActionState> {
  return runAction(async () => {
    const admin = await requireAdmin();
    await prisma.enrollment.delete({ where: { id: enrollmentId } });
    await audit({ userId: admin.id, action: "DELETE", entity: "Enrollment", entityId: enrollmentId });
    revalidatePath(`/runs/${runId}`);
  });
}

// --------------------------------------------------------------------------
// Per-run deliverable due-date overrides
// --------------------------------------------------------------------------

const setDueDateSchema = z.object({ dueDate: deliverableDueDateSchema.shape.dueDate });

export async function setDeliverableDueDate(
  runId: string,
  deliverableId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  return runAction(async () => {
    const admin = await requireAdmin();
    const { dueDate } = setDueDateSchema.parse({ dueDate: formData.get("dueDate") });
    await prisma.deliverableDueDate.upsert({
      where: { deliverableId_programRunId: { deliverableId, programRunId: runId } },
      update: { dueDate },
      create: { deliverableId, programRunId: runId, dueDate },
    });
    await audit({ userId: admin.id, action: "UPDATE", entity: "DeliverableDueDate", entityId: deliverableId });
    revalidatePath(`/runs/${runId}`);
  });
}
