"use client";

import { useFormState } from "react-dom";
import { emptyActionState, type ActionState } from "@/lib/action-result";
import { FormError, SubmitButton } from "@/components/form";

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

export function EnrollForm({
  action,
  participants,
}: {
  action: Action;
  participants: {
    id: string;
    firstName: string;
    lastName: string;
    employeeId: string;
    cohortCode: string;
  }[];
}) {
  const [state, formAction] = useFormState(action, emptyActionState);

  if (participants.length === 0) {
    return (
      <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
        Every active participant is already enrolled in this run.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <FormError error={state.error} />
      {state.fieldErrors?.participantIds && (
        <p className="text-sm text-destructive">{state.fieldErrors.participantIds.join(" ")}</p>
      )}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {participants.map((p) => (
          <label
            key={p.id}
            className="flex items-center gap-2 rounded-md border p-2 text-sm hover:bg-accent"
          >
            <input type="checkbox" name="participantIds" value={p.id} className="h-4 w-4" />
            <span className="font-medium">
              {p.lastName}, {p.firstName}
            </span>
            <span className="ml-auto text-xs text-muted-foreground">
              {p.cohortCode} · {p.employeeId}
            </span>
          </label>
        ))}
      </div>
      <SubmitButton pendingLabel="Enrolling…">Enroll selected</SubmitButton>
    </form>
  );
}
