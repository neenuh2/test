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

export function SessionForm({
  action,
  modules,
  defaults,
}: {
  action: Action;
  modules: { id: string; title: string }[];
  defaults?: {
    moduleId: string;
    sessionDate: Date | string;
    startTime: string | null;
    endTime: string | null;
    location: string | null;
    mode: string;
    trainerName: string | null;
  };
}) {
  const [state, formAction] = useFormState(action, emptyActionState);
  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="max-w-2xl space-y-4">
      <FormError error={state.error} />

      <Field label="Module" htmlFor="moduleId" required error={fe.moduleId}>
        <Select id="moduleId" name="moduleId" defaultValue={defaults?.moduleId ?? ""} required>
          <option value="" disabled>
            Select a module…
          </option>
          {modules.map((m) => (
            <option key={m.id} value={m.id}>
              {m.title}
            </option>
          ))}
        </Select>
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Date" htmlFor="sessionDate" required error={fe.sessionDate}>
          <Input
            id="sessionDate"
            name="sessionDate"
            type="date"
            defaultValue={toDateInput(defaults?.sessionDate)}
            required
          />
        </Field>
        <Field label="Start time" htmlFor="startTime" error={fe.startTime}>
          <Input id="startTime" name="startTime" type="time" defaultValue={defaults?.startTime ?? ""} />
        </Field>
        <Field label="End time" htmlFor="endTime" error={fe.endTime}>
          <Input id="endTime" name="endTime" type="time" defaultValue={defaults?.endTime ?? ""} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Mode" htmlFor="mode" error={fe.mode}>
          <Select id="mode" name="mode" defaultValue={defaults?.mode ?? "IN_PERSON"}>
            <option value="IN_PERSON">In person</option>
            <option value="VIRTUAL">Virtual</option>
            <option value="HYBRID">Hybrid</option>
          </Select>
        </Field>
        <Field label="Location" htmlFor="location" error={fe.location}>
          <Input id="location" name="location" defaultValue={defaults?.location ?? ""} />
        </Field>
      </div>

      <Field label="Trainer" htmlFor="trainerName" error={fe.trainerName}>
        <Input id="trainerName" name="trainerName" defaultValue={defaults?.trainerName ?? ""} />
      </Field>

      <SubmitButton>{defaults ? "Save session" : "Add session"}</SubmitButton>
    </form>
  );
}
