"use client";

import { useFormState } from "react-dom";
import { emptyActionState, type ActionState } from "@/lib/action-result";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/form";

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

function toDateInput(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toISOString().slice(0, 10);
}

/** Inline form to set/override a deliverable's due date for this run. */
export function DueDateForm({
  action,
  current,
}: {
  action: Action;
  current: Date | string | null;
}) {
  const [state, formAction] = useFormState(action, emptyActionState);

  return (
    <form action={formAction} className="flex items-center gap-2">
      <Input
        type="date"
        name="dueDate"
        defaultValue={toDateInput(current)}
        className="h-9 w-40"
        required
        aria-label="Due date"
      />
      <SubmitButton size="sm" variant="outline" pendingLabel="…">
        Set
      </SubmitButton>
      {state.error && <span className="text-xs text-destructive">{state.error}</span>}
      {state.ok && <span className="text-xs text-green-600">Saved</span>}
    </form>
  );
}
