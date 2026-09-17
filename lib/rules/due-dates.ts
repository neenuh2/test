/**
 * Pure business rule: resolve a deliverable's concrete due date for a run.
 *
 * Precedence (spec §6.1):
 *   1. An explicit per-run override (DeliverableDueDate) wins.
 *   2. Otherwise `dueOffsetDays` after the run start date.
 *   3. Otherwise there is no resolvable due date (returns null).
 *
 * Kept dependency-free so it can be unit-tested in isolation.
 */
export function resolveDueDate(params: {
  dueOffsetDays: number | null;
  runStartDate: Date;
  overrideDueDate?: Date | null;
}): Date | null {
  const { dueOffsetDays, runStartDate, overrideDueDate } = params;

  if (overrideDueDate) return overrideDueDate;

  if (dueOffsetDays != null) {
    const d = new Date(runStartDate);
    d.setUTCDate(d.getUTCDate() + dueOffsetDays);
    return d;
  }

  return null;
}
