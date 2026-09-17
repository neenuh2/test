"use client";

import Link from "next/link";
import { useTransition } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { DeleteButton } from "@/components/delete-button";

type VoidAction = () => Promise<{ error?: string } | void>;

/** Up/down reorder + edit + delete controls for a module row (admin only). */
export function ModuleActions({
  editHref,
  moveUp,
  moveDown,
  del,
  canMoveUp,
  canMoveDown,
}: {
  editHref: string;
  moveUp: VoidAction;
  moveDown: VoidAction;
  del: VoidAction;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-label="Move up"
        disabled={!canMoveUp || pending}
        onClick={() => startTransition(() => void moveUp())}
      >
        ↑
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-label="Move down"
        disabled={!canMoveDown || pending}
        onClick={() => startTransition(() => void moveDown())}
      >
        ↓
      </Button>
      <Link href={editHref} className={buttonVariants({ variant: "outline", size: "sm" })}>
        Edit
      </Link>
      <DeleteButton action={del} confirmMessage="Delete this module and its sessions/scoping?" />
    </div>
  );
}

/** Edit + delete controls for a simple row (admin only). */
export function RowActions({
  editHref,
  del,
  confirmMessage,
}: {
  editHref: string;
  del: VoidAction;
  confirmMessage?: string;
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      <Link href={editHref} className={buttonVariants({ variant: "outline", size: "sm" })}>
        Edit
      </Link>
      <DeleteButton action={del} confirmMessage={confirmMessage} />
    </div>
  );
}
