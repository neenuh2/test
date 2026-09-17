/**
 * Standalone scheduled worker entrypoint.
 *
 * Phase 0: placeholder that wires up node-cron with the Asia/Manila timezone.
 * Phase 4 fills in the daily due-date scan that generates NotificationLog
 * reminder drafts. Kept as its own process so it can be run in a separate
 * container (see docker-compose `cron` service) or triggered externally.
 */
import cron from "node-cron";

const TZ = process.env.APP_TIMEZONE ?? "Asia/Manila";

async function runDailyJob() {
  const now = new Date();
  console.log(`[cron] daily due-date scan tick at ${now.toISOString()} (tz=${TZ})`);
  // Phase 4: evaluate due dates, generate reminder drafts (idempotent).
}

function start() {
  // Every day at 06:00 Asia/Manila.
  cron.schedule("0 6 * * *", runDailyJob, { timezone: TZ });
  console.log(`[cron] scheduler started (tz=${TZ}); daily job at 06:00`);
}

// Allow manual one-off run: `tsx scripts/cron.ts --once`
if (process.argv.includes("--once")) {
  runDailyJob().then(() => process.exit(0));
} else {
  start();
}
