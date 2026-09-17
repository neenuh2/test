"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";

/**
 * Confirm-then-delete button bound to a server action.
 * The action receives the id via a bound argument. Only shown to admins
 * (the caller decides whether to render it); the action re-checks on the server.
 */
export function DeleteButton({
  action,
  confirmMessage = "Delete this item? This cannot be undone.",
  label = "Delete",
  size = "sm",
}: {
  action: () => Promise<{ error?: string } | void>;
  confirmMessage?: string;
  label?: string;
  size?: "sm" | "default";
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="destructive"
      size={size}
      disabled={pending}
      onClick={() => {
        if (!window.confirm(confirmMessage)) return;
        startTransition(async () => {
          const res = await action();
          if (res?.error) window.alert(res.error);
        });
      }}
    >
      {pending ? "Deleting…" : label}
    </Button>
  );
}
