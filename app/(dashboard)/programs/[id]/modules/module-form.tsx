"use client";

import { useFormState } from "react-dom";
import { emptyActionState, type ActionState } from "@/lib/action-result";
import { Field, FormError, SubmitButton } from "@/components/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

export function ModuleForm({
  action,
  cohorts,
  defaults,
}: {
  action: Action;
  cohorts: { id: string; code: string; name: string }[];
  defaults?: { title: string; description: string | null; cohortIds: string[] };
}) {
  const [state, formAction] = useFormState(action, emptyActionState);
  const fe = state.fieldErrors ?? {};
  const selected = new Set(defaults?.cohortIds ?? []);

  return (
    <form action={formAction} className="max-w-2xl space-y-4">
      <FormError error={state.error} />

      <Field label="Title" htmlFor="title" required error={fe.title}>
        <Input id="title" name="title" defaultValue={defaults?.title} required />
      </Field>

      <Field label="Description" htmlFor="description" error={fe.description}>
        <Textarea id="description" name="description" defaultValue={defaults?.description ?? ""} />
      </Field>

      <Field
        label="Cohort scope"
        hint="Leave all unchecked to apply this module to ALL cohorts in the program."
        error={fe.cohortIds}
      >
        <div className="grid gap-2 sm:grid-cols-2">
          {cohorts.map((c) => (
            <label
              key={c.id}
              className="flex items-center gap-2 rounded-md border p-2 text-sm"
            >
              <input
                type="checkbox"
                name="cohortIds"
                value={c.id}
                defaultChecked={selected.has(c.id)}
                className="h-4 w-4"
              />
              <span className="font-medium">{c.code}</span>
              <span className="text-muted-foreground">{c.name}</span>
            </label>
          ))}
        </div>
      </Field>

      <SubmitButton>{defaults ? "Save module" : "Add module"}</SubmitButton>
    </form>
  );
}
