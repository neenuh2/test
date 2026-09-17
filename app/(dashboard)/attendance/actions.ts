"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { runAction, type ActionState } from "@/lib/action-result";
import { recomputeRunCompletion } from "@/lib/services/completion";

const statusEnum = z.enum(["PRESENT", "ABSENT", "LATE", "EXCUSED"]);

/**
 * Save all attendance statuses for a session in one submit (spec §6.3).
 * Form fields are named `status:<participantId>`. Only participants rendered
 * in the grid (applicable to the session's module) are saved.
 */
export async function saveAttendance(
  sessionId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  return runAction(async () => {
    const admin = await requireAdmin();

    // Collect submitted statuses.
    const updates: { participantId: string; status: z.infer<typeof statusEnum> }[] = [];
    for (const [key, value] of formData.entries()) {
      if (!key.startsWith("status:")) continue;
      const participantId = key.slice("status:".length);
      const parsed = statusEnum.safeParse(value);
      if (!parsed.success) continue;
      updates.push({ participantId, status: parsed.data });
    }

    if (updates.length > 0) {
      await prisma.$transaction(
        updates.map((u) =>
          prisma.attendance.upsert({
            where: {
              sessionId_participantId: { sessionId, participantId: u.participantId },
            },
            update: { status: u.status, markedByUserId: admin.id, markedAt: new Date() },
            create: {
              sessionId,
              participantId: u.participantId,
              status: u.status,
              markedByUserId: admin.id,
            },
          })
        )
      );
    }

    await audit({
      userId: admin.id,
      action: "UPDATE",
      entity: "Attendance",
      entityId: sessionId,
      meta: { count: updates.length },
    });

    // Attendance affects completion — recompute for the run.
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      select: { programRunId: true },
    });
    if (session) await recomputeRunCompletion(session.programRunId);

    // Refresh the grid, run overview, and any participant/completion views.
    revalidatePath(`/attendance/sessions/${sessionId}`);
    if (session) {
      revalidatePath(`/attendance/${session.programRunId}`);
      revalidatePath(`/deliverables/${session.programRunId}`);
    }
    return { ok: true };
  });
}
