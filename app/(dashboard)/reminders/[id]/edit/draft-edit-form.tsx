"use client";

import { useFormState } from "react-dom";
import { emptyActionState, type ActionState } from "@/lib/action-result";
import { Field, FormError, SubmitButton } from "@/components/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

export function DraftEditForm({
  action,
  subject,
  body,
}: {
  action: Action;
  subject: string;
  body: string;
}) {
  const [state, formAction] = useFormState(action, emptyActionState);
  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="max-w-2xl space-y-4">
      <FormError error={state.error} />
      <Field label="Subject" htmlFor="subject" required error={fe.subject}>
        <Input id="subject" name="subject" defaultValue={subject} required />
      </Field>
      <Field label="Body (HTML)" htmlFor="body" required error={fe.body}>
        <Textarea id="body" name="body" defaultValue={body} rows={12} required />
      </Field>
      <SubmitButton>Save draft</SubmitButton>
    </form>
  );
}
