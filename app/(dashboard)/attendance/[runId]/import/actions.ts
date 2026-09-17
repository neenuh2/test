"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { parseCsv } from "@/lib/csv";
import { formatDateKey } from "@/lib/format";
import { moduleAppliesToCohort } from "@/lib/rules/attendance";
import { recomputeRunCompletion } from "@/lib/services/completion";

const statusEnum = z.enum(["PRESENT", "ABSENT", "LATE", "EXCUSED"]);

export type ImportRow = {
  line: number;
  employeeId: string;
  moduleTitle: string;
  sessionDate: string;
  status: string;
  participantName?: string;
  action: "create" | "update" | "reject";
  reason?: string;
  // Present on resolvable rows so commit doesn't re-resolve.
  sessionId?: string;
  participantId?: string;
  normalizedStatus?: z.infer<typeof statusEnum>;
};

export type ImportResult = {
  error?: string;
  rows?: ImportRow[];
  summary?: { create: number; update: number; reject: number; total: number };
};

/** Expected CSV headers (employeeName is optional/ignored on import). */
export const IMPORT_HEADERS = ["employeeId", "moduleTitle", "sessionDate", "status"];

async function classify(runId: string, csvText: string): Promise<ImportResult> {
  const run = await prisma.programRun.findUnique({
    where: { id: runId },
    include: {
      sessions: {
        include: { module: { select: { title: true, moduleCohorts: { select: { cohortId: true } } } } },
      },
      enrollments: {
        include: { participant: { select: { id: true, employeeId: true, firstName: true, lastName: true, cohortId: true } } },
      },
    },
  });
  if (!run) return { error: "Program run not found." };

  // Lookup maps.
  const participantByEmp = new Map(
    run.enrollments.map((e) => [
      e.participant.employeeId.toLowerCase(),
      e.participant,
    ])
  );
  // sessionByKey: moduleTitle|dateKey -> sessionId or "AMBIGUOUS"
  const sessionByKey = new Map<string, string>();
  const scopeBySession = new Map<string, string[]>();
  for (const s of run.sessions) {
    const key = `${s.module.title.trim().toLowerCase()}|${formatDateKey(s.sessionDate)}`;
    sessionByKey.set(key, sessionByKey.has(key) ? "AMBIGUOUS" : s.id);
    scopeBySession.set(s.id, s.module.moduleCohorts.map((mc) => mc.cohortId));
  }
  const existing = await prisma.attendance.findMany({
    where: { session: { programRunId: runId } },
    select: { sessionId: true, participantId: true },
  });
  const existingSet = new Set(existing.map((a) => `${a.sessionId}:${a.participantId}`));

  const { headers, rows } = parseCsv(csvText);
  const missingHeaders = IMPORT_HEADERS.filter((h) => !headers.includes(h));
  if (missingHeaders.length > 0) {
    return { error: `CSV is missing required column(s): ${missingHeaders.join(", ")}.` };
  }

  const out: ImportRow[] = [];
  let create = 0;
  let update = 0;
  let reject = 0;

  rows.forEach((r, i) => {
    const line = i + 2; // +1 header, +1 to 1-index
    const employeeId = (r.employeeId ?? "").trim();
    const moduleTitle = (r.moduleTitle ?? "").trim();
    const sessionDate = (r.sessionDate ?? "").trim();
    const statusRaw = (r.status ?? "").trim();

    const base: ImportRow = { line, employeeId, moduleTitle, sessionDate, status: statusRaw, action: "reject" };

    // Skip fully-blank status rows quietly as rejects with a clear reason.
    if (!statusRaw) {
      reject++;
      out.push({ ...base, reason: "No status provided" });
      return;
    }
    const statusParsed = statusEnum.safeParse(statusRaw.toUpperCase());
    if (!statusParsed.success) {
      reject++;
      out.push({ ...base, reason: `Invalid status "${statusRaw}"` });
      return;
    }

    const participant = participantByEmp.get(employeeId.toLowerCase());
    if (!participant) {
      reject++;
      out.push({ ...base, reason: "Employee not enrolled in this run" });
      return;
    }
    base.participantName = `${participant.lastName}, ${participant.firstName}`;

    const sessionId = sessionByKey.get(`${moduleTitle.toLowerCase()}|${sessionDate}`);
    if (!sessionId) {
      reject++;
      out.push({ ...base, reason: "No matching session (module + date)" });
      return;
    }
    if (sessionId === "AMBIGUOUS") {
      reject++;
      out.push({ ...base, reason: "Multiple sessions match module + date" });
      return;
    }

    const scoped = scopeBySession.get(sessionId) ?? [];
    if (!moduleAppliesToCohort(scoped, participant.cohortId)) {
      reject++;
      out.push({ ...base, reason: "Module not applicable to participant's cohort" });
      return;
    }

    const isUpdate = existingSet.has(`${sessionId}:${participant.id}`);
    if (isUpdate) update++;
    else create++;
    out.push({
      ...base,
      action: isUpdate ? "update" : "create",
      sessionId,
      participantId: participant.id,
      normalizedStatus: statusParsed.data,
    });
  });

  return {
    rows: out,
    summary: { create, update, reject, total: out.length },
  };
}

/** Dry-run: classify rows without writing. */
export async function previewAttendanceImport(
  runId: string,
  csvText: string
): Promise<ImportResult> {
  await requireAdmin();
  return classify(runId, csvText);
}

/** Commit: apply all create/update rows. */
export async function commitAttendanceImport(
  runId: string,
  csvText: string
): Promise<ImportResult & { committed?: number }> {
  const admin = await requireAdmin();
  const result = await classify(runId, csvText);
  if (result.error || !result.rows) return result;

  const toApply = result.rows.filter(
    (r) => r.action !== "reject" && r.sessionId && r.participantId && r.normalizedStatus
  );

  if (toApply.length > 0) {
    // Chunked transaction to stay well within parameter limits at scale.
    const chunkSize = 200;
    for (let i = 0; i < toApply.length; i += chunkSize) {
      const chunk = toApply.slice(i, i + chunkSize);
      await prisma.$transaction(
        chunk.map((r) =>
          prisma.attendance.upsert({
            where: {
              sessionId_participantId: {
                sessionId: r.sessionId!,
                participantId: r.participantId!,
              },
            },
            update: { status: r.normalizedStatus!, markedByUserId: admin.id, markedAt: new Date() },
            create: {
              sessionId: r.sessionId!,
              participantId: r.participantId!,
              status: r.normalizedStatus!,
              markedByUserId: admin.id,
            },
          })
        )
      );
    }
  }

  await audit({
    userId: admin.id,
    action: "UPDATE",
    entity: "Attendance",
    entityId: runId,
    meta: { imported: toApply.length, source: "csv" },
  });

  await recomputeRunCompletion(runId);

  revalidatePath(`/attendance/${runId}`);
  revalidatePath(`/deliverables/${runId}`);
  return { ...result, committed: toApply.length };
}
