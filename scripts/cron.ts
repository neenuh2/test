/**
 * Standalone scheduled worker (spec §4, §6.5).
 *
 * Runs a daily job (Asia/Manila) that scans due dates and generates reminder
 * drafts in the NotificationLog. Drafts wait in the review queue unless
 * EMAIL_AUTO_SEND is on, in which case they are sent immediately. The job is
 * idempotent and safe to re-run.
 *
 * Run continuously:      npm run cron
 * Run once (e.g. via an external scheduler / cron container):  tsx scripts/cron.ts --once
 */
import "dotenv/config";
import cron from "node-cron";
import { generateReminderDrafts } from "@/lib/services/reminders";

const TZ = process.env.APP_TIMEZONE ?? "Asia/Manila";

async function runDailyJob() {
  const started = new Date();
  console.log(`[cron] due-date scan started at ${started.toISOString()} (tz=${TZ})`);
  try {
    const { created, sent } = await generateReminderDrafts(started);
    console.log(`[cron] done: ${created} draft(s) created, ${sent} sent`);
  } catch (err) {
    console.error("[cron] job failed:", err);
    process.exitCode = 1;
  }
}

if (process.argv.includes("--once")) {
  runDailyJob().then(() => process.exit(process.exitCode ?? 0));
} else {
  // Every day at 06:00 Asia/Manila.
  cron.schedule("0 6 * * *", runDailyJob, { timezone: TZ });
  console.log(`[cron] scheduler started (tz=${TZ}); daily job at 06:00`);
}
