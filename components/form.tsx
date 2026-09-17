"use client";

import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

/** Submit button that shows a pending state while the action runs. */
export function SubmitButton({
  children,
  pendingLabel = "Saving…",
  ...props
}: ButtonProps & { pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} {...props}>
      {pending ? pendingLabel : children}
    </Button>
  );
}

/** Field wrapper: label, control (children), and optional field error. */
export function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
}: {
  label: string;
  htmlFor?: string;
  error?: string[];
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error?.length ? (
        <p className="text-xs text-destructive">{error.join(" ")}</p>
      ) : null}
    </div>
  );
}

/** Top-of-form error banner. */
export function FormError({ error }: { error?: string }) {
  if (!error) return null;
  return (
    <p
      role="alert"
      className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
    >
      {error}
    </p>
  );
}
