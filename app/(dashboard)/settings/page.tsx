import { auth } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CompletionSettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";
  const settings = await getSettings();
  const thresholdPercent = Math.round(settings.completionAttendanceThreshold * 100);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Configuration for completion, reminders, and email."
      />

      <Card>
        <CardHeader>
          <CardTitle>Completion rule</CardTitle>
          <CardDescription>
            A participant is COMPLETED when their attendance rate meets the threshold and
            every applicable required deliverable is submitted or accepted.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isAdmin ? (
            <CompletionSettingsForm thresholdPercent={thresholdPercent} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Current threshold: <span className="font-medium">{thresholdPercent}%</span>{" "}
              attendance. Only admins can change settings.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reminders &amp; email</CardTitle>
          <CardDescription>
            Reminder offsets, overdue cadence, auto-send, and SMTP are configured in Phase 4.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <ul className="space-y-1">
            <li>Upcoming offsets: {settings.reminderUpcomingOffsets.join(", ")} day(s) before due</li>
            <li>Overdue cadence: every {settings.reminderOverdueIntervalDays} day(s), up to {settings.reminderOverdueMaxCount}×</li>
            <li>Auto-send: {settings.emailAutoSend ? "on" : "off (review queue)"}</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
