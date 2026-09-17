import { prisma } from "@/lib/db";

/**
 * Application settings resolved from (in order): the Setting table (in-app,
 * editable), then environment variables, then hard-coded defaults. Keeps
 * completion/reminder/email behavior configurable rather than hard-coded
 * (spec §8).
 */
export type AppSettings = {
  /** Attendance rate (0..1) required for completion. */
  completionAttendanceThreshold: number;
  /** Bypass the reminder review queue and send automatically (Phase 4). */
  emailAutoSend: boolean;
  /** Days-before-due to send UPCOMING reminders (Phase 4). */
  reminderUpcomingOffsets: number[];
  /** Re-notify cadence for overdue items, in days (Phase 4). */
  reminderOverdueIntervalDays: number;
  /** Max overdue reminders per (participant, deliverable) (Phase 4). */
  reminderOverdueMaxCount: number;
};

export const SETTING_KEYS = {
  completionAttendanceThreshold: "COMPLETION_ATTENDANCE_THRESHOLD",
  emailAutoSend: "EMAIL_AUTO_SEND",
  reminderUpcomingOffsets: "REMINDER_UPCOMING_OFFSETS",
  reminderOverdueIntervalDays: "REMINDER_OVERDUE_INTERVAL_DAYS",
  reminderOverdueMaxCount: "REMINDER_OVERDUE_MAX_COUNT",
} as const;

const DEFAULTS: AppSettings = {
  completionAttendanceThreshold: 0.8,
  emailAutoSend: false,
  reminderUpcomingOffsets: [3, 1],
  reminderOverdueIntervalDays: 2,
  reminderOverdueMaxCount: 3,
};

function parseNumber(v: string | undefined, fallback: number): number {
  if (v == null || v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function parseBool(v: string | undefined, fallback: boolean): boolean {
  if (v == null || v === "") return fallback;
  return v === "true" || v === "1" || v === "on";
}

function parseOffsets(v: string | undefined, fallback: number[]): number[] {
  if (!v) return fallback;
  const parts = v
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n >= 0);
  return parts.length > 0 ? parts : fallback;
}

/** Resolve all settings (DB → env → defaults). */
export async function getSettings(): Promise<AppSettings> {
  const rows = await prisma.setting.findMany();
  const db = new Map(rows.map((r) => [r.key, r.value]));

  const pick = (key: string) => db.get(key) ?? process.env[key];

  return {
    completionAttendanceThreshold: Math.min(
      1,
      Math.max(0, parseNumber(pick(SETTING_KEYS.completionAttendanceThreshold), DEFAULTS.completionAttendanceThreshold))
    ),
    emailAutoSend: parseBool(pick(SETTING_KEYS.emailAutoSend), DEFAULTS.emailAutoSend),
    reminderUpcomingOffsets: parseOffsets(
      pick(SETTING_KEYS.reminderUpcomingOffsets),
      DEFAULTS.reminderUpcomingOffsets
    ),
    reminderOverdueIntervalDays: parseNumber(
      pick(SETTING_KEYS.reminderOverdueIntervalDays),
      DEFAULTS.reminderOverdueIntervalDays
    ),
    reminderOverdueMaxCount: parseNumber(
      pick(SETTING_KEYS.reminderOverdueMaxCount),
      DEFAULTS.reminderOverdueMaxCount
    ),
  };
}

/** Persist a single setting override into the DB. */
export async function setSetting(key: string, value: string): Promise<void> {
  await prisma.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}
