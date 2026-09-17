import type { SubmissionStatus } from "@prisma/client";

/**
 * Pure submission business rules (spec §6.4). Dependency-free for unit testing.
 */

/** Effective display state adds OVERDUE for a not-submitted, past-due item. */
export type EffectiveSubmissionState = SubmissionStatus | "OVERDUE";

/**
 * Determine the status to store when saving a submission. If the reviewer
 * marks it SUBMITTED but the submission timestamp is after the due date, it is
 * auto-flagged LATE. ACCEPTED / RESUBMIT / NOT_SUBMITTED are left as chosen.
 */
export function autoFlagStatus(
  desired: SubmissionStatus,
  submittedAt: Date | null,
  dueDate: Date | null
): SubmissionStatus {
  if (desired === "SUBMITTED" && submittedAt && dueDate && submittedAt > dueDate) {
    return "LATE";
  }
  return desired;
}

/**
 * Effective state for display and at-risk detection: a NOT_SUBMITTED item that
 * is past its due date is surfaced as OVERDUE (spec §6.4). Everything else
 * shows its stored status.
 */
export function effectiveSubmissionState(
  status: SubmissionStatus,
  dueDate: Date | null,
  now: Date
): EffectiveSubmissionState {
  if (status === "NOT_SUBMITTED" && dueDate && now > dueDate) return "OVERDUE";
  return status;
}

/**
 * Whether a submission counts toward completion. A submission is satisfied if
 * it has been submitted (on time or late) or accepted. NOT_SUBMITTED and
 * RESUBMIT do not satisfy.
 */
export function isSubmissionSatisfied(status: SubmissionStatus): boolean {
  return status === "SUBMITTED" || status === "LATE" || status === "ACCEPTED";
}
