"use client";

import { useFormState } from "react-dom";
import { emptyActionState } from "@/lib/action-result";
import { Field, FormError, SubmitButton } from "@/components/form";
import { Input } from "@/components/ui/input";
import { updateCompletionSettings, updateReminderSettings } from "./actions";

export function CompletionSettingsForm({ thresholdPercent }: { thresholdPercent: number }) {
  const [state, formAction] = useFormState(updateCompletionSettings, emptyActionState);
  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="max-w-md space-y-4">
      <FormError error={state.error} />
      <Field
        label="Completion attendance threshold (%)"
        htmlFor="completionAttendanceThresholdPercent"
        hint="Minimum attendance rate a participant needs (with all required deliverables) to be marked COMPLETED."
        error={fe.completionAttendanceThresholdPercent}
        required
      >
        <Input
          id="completionAttendanceThresholdPercent"
          name="completionAttendanceThresholdPercent"
          type="number"
          min={0}
          max={100}
          step={1}
          defaultValue={thresholdPercent}
          required
        />
      </Field>
      <div className="flex items-center gap-3">
        <SubmitButton>Save settings</SubmitButton>
        {state.ok && <span className="text-sm text-green-600">Saved.</span>}
      </div>
    </form>
  );
}

export function ReminderSettingsForm({
  upcomingOffsets,
  overdueIntervalDays,
  overdueMaxCount,
  autoSend,
}: {
  upcomingOffsets: string;
  overdueIntervalDays: number;
  overdueMaxCount: number;
  autoSend: boolean;
}) {
  const [state, formAction] = useFormState(updateReminderSettings, emptyActionState);
  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="max-w-md space-y-4">
      <FormError error={state.error} />
      <Field
        label="Upcoming reminder offsets (days before due)"
        htmlFor="reminderUpcomingOffsets"
        hint="Comma-separated, e.g. 3,1"
        error={fe.reminderUpcomingOffsets}
        required
      >
        <Input
          id="reminderUpcomingOffsets"
          name="reminderUpcomingOffsets"
          defaultValue={upcomingOffsets}
          required
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Overdue re-notify every (days)"
          htmlFor="reminderOverdueIntervalDays"
          error={fe.reminderOverdueIntervalDays}
          required
        >
          <Input
            id="reminderOverdueIntervalDays"
            name="reminderOverdueIntervalDays"
            type="number"
            min={1}
            defaultValue={overdueIntervalDays}
            required
          />
        </Field>
        <Field
          label="Max overdue reminders"
          htmlFor="reminderOverdueMaxCount"
          error={fe.reminderOverdueMaxCount}
          required
        >
          <Input
            id="reminderOverdueMaxCount"
            name="reminderOverdueMaxCount"
            type="number"
            min={0}
            defaultValue={overdueMaxCount}
            required
          />
        </Field>
      </div>
      <Field label="Auto-send" htmlFor="emailAutoSend" error={fe.emailAutoSend}>
        <label className="flex h-10 items-center gap-2 text-sm">
          <input
            id="emailAutoSend"
            type="checkbox"
            name="emailAutoSend"
            defaultChecked={autoSend}
            className="h-4 w-4"
          />
          Send reminders automatically (bypass the review queue)
        </label>
      </Field>
      <div className="flex items-center gap-3">
        <SubmitButton>Save reminder settings</SubmitButton>
        {state.ok && <span className="text-sm text-green-600">Saved.</span>}
      </div>
    </form>
  );
}
