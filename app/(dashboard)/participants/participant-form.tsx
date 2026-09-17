"use client";

import { useFormState } from "react-dom";
import { emptyActionState, type ActionState } from "@/lib/action-result";
import { Field, FormError, SubmitButton } from "@/components/form";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

export function ParticipantForm({
  action,
  cohorts,
  defaults,
}: {
  action: Action;
  cohorts: { id: string; code: string; name: string }[];
  defaults?: {
    employeeId: string;
    firstName: string;
    lastName: string;
    email: string;
    cohortId: string;
    branch: string | null;
    region: string | null;
    isActive: boolean;
  };
}) {
  const [state, formAction] = useFormState(action, emptyActionState);
  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="max-w-2xl space-y-4">
      <FormError error={state.error} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Employee ID" htmlFor="employeeId" required error={fe.employeeId}>
          <Input id="employeeId" name="employeeId" defaultValue={defaults?.employeeId} required />
        </Field>
        <Field label="Cohort" htmlFor="cohortId" required error={fe.cohortId}>
          <Select id="cohortId" name="cohortId" defaultValue={defaults?.cohortId ?? ""} required>
            <option value="" disabled>
              Select a cohort…
            </option>
            {cohorts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} — {c.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First name" htmlFor="firstName" required error={fe.firstName}>
          <Input id="firstName" name="firstName" defaultValue={defaults?.firstName} required />
        </Field>
        <Field label="Last name" htmlFor="lastName" required error={fe.lastName}>
          <Input id="lastName" name="lastName" defaultValue={defaults?.lastName} required />
        </Field>
      </div>

      <Field label="Email" htmlFor="email" required error={fe.email}>
        <Input id="email" name="email" type="email" defaultValue={defaults?.email} required />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Branch" htmlFor="branch" error={fe.branch}>
          <Input id="branch" name="branch" defaultValue={defaults?.branch ?? ""} />
        </Field>
        <Field label="Region" htmlFor="region" error={fe.region}>
          <Input id="region" name="region" defaultValue={defaults?.region ?? ""} />
        </Field>
      </div>

      <Field label="Active?" htmlFor="isActive" error={fe.isActive}>
        <label className="flex h-10 items-center gap-2 text-sm">
          <input
            id="isActive"
            type="checkbox"
            name="isActive"
            defaultChecked={defaults?.isActive ?? true}
            className="h-4 w-4"
          />
          Participant is active
        </label>
      </Field>

      <SubmitButton>{defaults ? "Save participant" : "Create participant"}</SubmitButton>
    </form>
  );
}
