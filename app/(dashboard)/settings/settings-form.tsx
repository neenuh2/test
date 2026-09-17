"use client";

import { useFormState } from "react-dom";
import { emptyActionState } from "@/lib/action-result";
import { Field, FormError, SubmitButton } from "@/components/form";
import { Input } from "@/components/ui/input";
import { updateCompletionSettings } from "./actions";

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
