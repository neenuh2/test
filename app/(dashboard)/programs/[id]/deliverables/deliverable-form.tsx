"use client";

import { useFormState } from "react-dom";
import { emptyActionState, type ActionState } from "@/lib/action-result";
import { Field, FormError, SubmitButton } from "@/components/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

export function DeliverableForm({
  action,
  modules,
  defaults,
}: {
  action: Action;
  modules: { id: string; title: string }[];
  defaults?: {
    title: string;
    description: string | null;
    moduleId: string | null;
    dueOffsetDays: number | null;
    weight: number | null;
    isRequired: boolean;
  };
}) {
  const [state, formAction] = useFormState(action, emptyActionState);
  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="max-w-2xl space-y-4">
      <FormError error={state.error} />

      <Field label="Title" htmlFor="title" required error={fe.title}>
        <Input id="title" name="title" defaultValue={defaults?.title} required />
      </Field>

      <Field label="Description" htmlFor="description" error={fe.description}>
        <Textarea id="description" name="description" defaultValue={defaults?.description ?? ""} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Module (optional)" htmlFor="moduleId" error={fe.moduleId}>
          <Select id="moduleId" name="moduleId" defaultValue={defaults?.moduleId ?? ""}>
            <option value="">— Program-wide —</option>
            {modules.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Due offset (days after run start)"
          htmlFor="dueOffsetDays"
          hint="Leave blank to set an explicit due date per run instead."
          error={fe.dueOffsetDays}
        >
          <Input
            id="dueOffsetDays"
            name="dueOffsetDays"
            type="number"
            min={0}
            defaultValue={defaults?.dueOffsetDays ?? ""}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Weight (optional)" htmlFor="weight" error={fe.weight}>
          <Input
            id="weight"
            name="weight"
            type="number"
            step="0.1"
            defaultValue={defaults?.weight ?? ""}
          />
        </Field>
        <Field label="Required?" htmlFor="isRequired" error={fe.isRequired}>
          <label className="flex h-10 items-center gap-2 text-sm">
            <input
              id="isRequired"
              type="checkbox"
              name="isRequired"
              defaultChecked={defaults?.isRequired ?? true}
              className="h-4 w-4"
            />
            Counts toward completion
          </label>
        </Field>
      </div>

      <SubmitButton>{defaults ? "Save deliverable" : "Add deliverable"}</SubmitButton>
    </form>
  );
}
