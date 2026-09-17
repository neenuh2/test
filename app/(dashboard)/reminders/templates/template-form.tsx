"use client";

import { useFormState } from "react-dom";
import { emptyActionState } from "@/lib/action-result";
import { Field, FormError, SubmitButton } from "@/components/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { saveTemplate } from "./actions";

export function TemplateForm({
  type,
  subject,
  body,
  readOnly,
}: {
  type: string;
  subject: string;
  body: string;
  readOnly?: boolean;
}) {
  const [state, formAction] = useFormState(saveTemplate, emptyActionState);
  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-3">
      <FormError error={state.error} />
      <input type="hidden" name="type" value={type} />
      <Field label="Subject" htmlFor={`subject-${type}`} required error={fe.subject}>
        <Input id={`subject-${type}`} name="subject" defaultValue={subject} disabled={readOnly} required />
      </Field>
      <Field label="Body (HTML)" htmlFor={`body-${type}`} required error={fe.body}>
        <Textarea id={`body-${type}`} name="body" defaultValue={body} rows={10} disabled={readOnly} required />
      </Field>
      {!readOnly && (
        <div className="flex items-center gap-3">
          <SubmitButton>Save template</SubmitButton>
          {state.ok && <span className="text-sm text-green-600">Saved.</span>}
        </div>
      )}
    </form>
  );
}
