import { formatInTimeZone } from "date-fns-tz";

export const APP_TIMEZONE = process.env.APP_TIMEZONE ?? "Asia/Manila";

/** Display a date as `DD MMM YYYY` in the app timezone (spec §3 locale). */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return formatInTimeZone(d, APP_TIMEZONE, "dd MMM yyyy");
}

/** Display a date + time as `DD MMM YYYY, HH:mm`. */
export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return formatInTimeZone(d, APP_TIMEZONE, "dd MMM yyyy, HH:mm");
}

/** Format a fraction (0..1) as a whole-number percentage string. */
export function formatPercent(value: number, digits = 0): string {
  return `${(value * 100).toFixed(digits)}%`;
}

/** A stable `yyyy-MM-dd` key in the app timezone (used for CSV import/export). */
export function formatDateKey(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return formatInTimeZone(d, APP_TIMEZONE, "yyyy-MM-dd");
}
