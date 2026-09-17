/**
 * Pure program-completion rule (spec §6.4, [ASSUMPTION]):
 * a participant is COMPLETED for a run when
 *   (a) attendance rate ≥ a configurable threshold (default 0.8), AND
 *   (b) every applicable required deliverable is satisfied
 *       (SUBMITTED / LATE / ACCEPTED).
 *
 * DROPPED is a manual status and is never set by this rule.
 */
export type CompletionInput = {
  attendanceRate: number;
  threshold: number;
  /** One boolean per applicable required deliverable: is it satisfied? */
  requiredSatisfied: boolean[];
};

export type CompletionResult = {
  meetsAttendance: boolean;
  meetsDeliverables: boolean;
  completed: boolean;
};

export function computeCompletion(input: CompletionInput): CompletionResult {
  const meetsAttendance = input.attendanceRate >= input.threshold;
  const meetsDeliverables = input.requiredSatisfied.every(Boolean);
  return {
    meetsAttendance,
    meetsDeliverables,
    completed: meetsAttendance && meetsDeliverables,
  };
}
