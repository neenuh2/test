import { formatInTimeZone } from "date-fns-tz";
import type { NotificationType } from "@prisma/client";

/**
 * Pure due-date/reminder rules (spec §6.5). Dependency-free logic plus one
 * timezone-aware date helper, both unit-tested.
 */

/**
 * Whole calendar days from `now` to `dueDate`, evaluated in the app timezone.
 * Positive = due in the future, 0 = due today, negative = overdue.
 */
export function daysUntilDue(dueDate: Date, now: Date, tz: string): number {
  const key = (d: Date) => formatInTimeZone(d, tz, "yyyy-MM-dd");
  const toUTC = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((toUTC(key(dueDate)) - toUTC(key(now))) / 86_400_000);
}

export type ReminderPlanConfig = {
  upcomingOffsets: number[];
  overdueIntervalDays: number;
  overdueMaxCount: number;
};

/**
 * Decide which reminder (if any) applies today for one (participant,
 * deliverable) with a known due date. Returns a single NotificationType or
 * null. Overdue reminders only apply to required deliverables and fire on
 * multiples of the interval up to the maximum count.
 */
export function planReminder(params: {
  daysUntilDue: number;
  isRequired: boolean;
  config: ReminderPlanConfig;
}): NotificationType | null {
  const { daysUntilDue: d, isRequired, config } = params;

  if (d > 0) {
    return config.upcomingOffsets.includes(d) ? "UPCOMING" : null;
  }
  if (d === 0) {
    return "DUE_TODAY";
  }
  // Overdue.
  if (!isRequired) return null;
  const overdueDays = -d;
  const interval = config.overdueIntervalDays;
  if (interval <= 0) return null;
  if (overdueDays % interval !== 0) return null;
  const occurrence = overdueDays / interval;
  return occurrence >= 1 && occurrence <= config.overdueMaxCount ? "OVERDUE" : null;
}
