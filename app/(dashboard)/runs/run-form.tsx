"use client";

import { useFormState } from "react-dom";
import { emptyActionState, type ActionState } from "@/lib/action-result";
import { Field, FormError, SubmitButton } from "@/components/form";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

function toDateInput(d: Date | string | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toISOString().slice(0, 10);
}

export function RunForm({
  action,
  programs,
  defaults,
  lockProgram,
}: {
  action: Action;
  programs: { id: string; name: string; code: string }[];
  defaults?: {
    programId: string;
    name: string;
    startDate: Date | string;
    endDate: Date | string;
    status: string;
  };
  lockProgram?: boolean;
}) {
  const [state, formAction] = useFormState(action, emptyActionState);
  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="max-w-2xl space-y-4">
      <FormError error={state.error} />

      <Field label="Program" htmlFor="programId" required error={fe.programId}>
        <Select
          id="programId"
          name="programId"
          defaultValue={defaults?.programId ?? ""}
          disabled={lockProgram}
          required
        >
          <option value="" disabled>
            Select a program…
          </option>
          {programs.map((p) => (
            <option key={p.id} value={p.id}>
              {p.code} — {p.name}
            </option>
          ))}
        </Select>
        {lockProgram && defaults?.programId && (
          <input type="hidden" name="programId" value={defaults.programId} />
        )}
      </Field>

      <Field label="Run name" htmlFor="name" required error={fe.name} hint='e.g. "2026 Q1 Batch A"'>
        <Input id="name" name="name" defaultValue={defaults?.name} required />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Start date" htmlFor="startDate" required error={fe.startDate}>
          <Input
            id="startDate"
            name="startDate"
            type="date"
            defaultValue={toDateInput(defaults?.startDate)}
            required
          />
        </Field>
        <Field label="End date" htmlFor="endDate" required error={fe.endDate}>
          <Input
            id="endDate"
            name="endDate"
            type="date"
            defaultValue={toDateInput(defaults?.endDate)}
            required
          />
        </Field>
      </div>

      <Field label="Status" htmlFor="status" error={fe.status}>
        <Select id="status" name="status" defaultValue={defaults?.status ?? "PLANNED"}>
          <option value="PLANNED">Planned</option>
          <option value="ACTIVE">Active</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </Select>
      </Field>

      <SubmitButton>{defaults ? "Save run" : "Create run"}</SubmitButton>
    </form>
  );
}
