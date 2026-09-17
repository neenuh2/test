"use client";

import { useTransition, useState } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";

/** A button that runs a bound server action and reflects pending/done state. */
export function ActionButton({
  action,
  children,
  doneLabel = "Done",
  variant = "outline",
  size = "sm",
}: {
  action: () => Promise<{ error?: string } | void>;
  children: React.ReactNode;
  doneLabel?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
}) {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  return (
    <span className="inline-flex items-center gap-2">
      <Button
        type="button"
        variant={variant}
        size={size}
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setDone(false);
            const res = await action();
            if (res?.error) window.alert(res.error);
            else setDone(true);
          })
        }
      >
        {pending ? "Working…" : children}
      </Button>
      {done && <span className="text-xs text-green-600">{doneLabel}</span>}
    </span>
  );
}
