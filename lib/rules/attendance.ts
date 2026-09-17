import type { AttendanceStatus } from "@prisma/client";

/**
 * Pure attendance business rules (spec §6.3). Kept dependency-free so they can
 * be unit-tested in isolation and reused by views, the completion rule
 * (Phase 3), and the reminder engine (Phase 4).
 */

/** Statuses that count as "attended" for the attendance rate. */
const ATTENDED: ReadonlySet<AttendanceStatus> = new Set(["PRESENT", "LATE"]);
/** Statuses that mean a module is NOT missed (present, late, or excused). */
const COVERED: ReadonlySet<AttendanceStatus> = new Set([
  "PRESENT",
  "LATE",
  "EXCUSED",
]);

/**
 * A module applies to a cohort when it has no explicit cohort scoping, or when
 * the cohort is one of its scoped cohorts (spec §5 ModuleCohort).
 */
export function moduleAppliesToCohort(
  scopedCohortIds: string[],
  cohortId: string
): boolean {
  return scopedCohortIds.length === 0 || scopedCohortIds.includes(cohortId);
}

export type AttendanceStats = {
  /** Applicable sessions for this participant. */
  applicable: number;
  /** PRESENT or LATE. */
  attended: number;
  absent: number;
  excused: number;
  /** Applicable sessions with no attendance record yet. */
  unrecorded: number;
  /**
   * Attendance rate in [0,1]. Excused sessions are removed from both numerator
   * and denominator so an authorized absence neither helps nor hurts. When
   * every applicable session is excused (or there are none), the rate is 1.
   */
  rate: number;
};

/**
 * Compute a participant's attendance stats over their applicable sessions.
 * `statusBySession` holds only the sessions that have a recorded status.
 */
export function computeAttendanceStats(input: {
  applicableSessionIds: string[];
  statusBySession: Map<string, AttendanceStatus>;
}): AttendanceStats {
  const { applicableSessionIds, statusBySession } = input;
  let attended = 0;
  let absent = 0;
  let excused = 0;
  let unrecorded = 0;

  for (const sid of applicableSessionIds) {
    const st = statusBySession.get(sid);
    if (!st) unrecorded++;
    else if (ATTENDED.has(st)) attended++;
    else if (st === "EXCUSED") excused++;
    else absent++; // ABSENT
  }

  const applicable = applicableSessionIds.length;
  const denom = applicable - excused;
  const rate = denom > 0 ? attended / denom : 1;

  return { applicable, attended, absent, excused, unrecorded, rate };
}

/**
 * Modules "missed" (spec §6.3): a module is missed when the participant has an
 * ABSENT or no attendance record across all of that module's sessions — i.e.
 * none of its sessions is PRESENT, LATE, or EXCUSED.
 */
export function computeModulesMissed(input: {
  moduleSessionIds: Map<string, string[]>; // moduleId -> sessionIds (applicable)
  statusBySession: Map<string, AttendanceStatus>;
}): string[] {
  const { moduleSessionIds, statusBySession } = input;
  const missed: string[] = [];

  for (const [moduleId, sessionIds] of moduleSessionIds) {
    if (sessionIds.length === 0) continue; // no sessions scheduled → not "missed"
    const covered = sessionIds.some((sid) => {
      const st = statusBySession.get(sid);
      return st != null && COVERED.has(st);
    });
    if (!covered) missed.push(moduleId);
  }

  return missed;
}
