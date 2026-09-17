"use client";

import { useFormState } from "react-dom";
import type { Program } from "@prisma/client";
import { emptyActionState, type ActionState } from "@/lib/action-result";
import { Field, FormError, SubmitButton } from "@/components/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

export function ProgramForm({
  action,
  program,
}: {
  action: Action;
  program?: Program;
}) {
  const [state, formAction] = useFormState(action, emptyActionState);
  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="max-w-2xl space-y-4">
      <FormError error={state.error} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Code" htmlFor="code" required error={fe.code}>
          <Input id="code" name="code" defaultValue={program?.code} required />
        </Field>
        <Field label="Status" htmlFor="status" error={fe.status}>
          <Select id="status" name="status" defaultValue={program?.status ?? "DRAFT"}>
            <option value="DRAFT">Draft</option>
            <option value="ACTIVE">Active</option>
            <option value="ARCHIVED">Archived</option>
          </Select>
        </Field>
      </div>

      <Field label="Name" htmlFor="name" required error={fe.name}>
        <Input id="name" name="name" defaultValue={program?.name} required />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Focus" htmlFor="focus" error={fe.focus}>
          <Input id="focus" name="focus" defaultValue={program?.focus ?? ""} />
        </Field>
        <Field
          label="Total training days"
          htmlFor="totalTrainingDays"
          error={fe.totalTrainingDays}
        >
          <Input
            id="totalTrainingDays"
            name="totalTrainingDays"
            type="number"
            min={0}
            defaultValue={program?.totalTrainingDays ?? 0}
          />
        </Field>
      </div>

      <Field label="Target audience" htmlFor="targetAudience" error={fe.targetAudience}>
        <Input
          id="targetAudience"
          name="targetAudience"
          defaultValue={program?.targetAudience ?? ""}
        />
      </Field>

      <Field label="Description" htmlFor="description" error={fe.description}>
        <Textarea
          id="description"
          name="description"
          defaultValue={program?.description ?? ""}
        />
      </Field>

      <div className="flex gap-2">
        <SubmitButton>{program ? "Save changes" : "Create program"}</SubmitButton>
      </div>
    </form>
  );
}
