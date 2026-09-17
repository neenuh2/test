"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { approveSelected, sendOne, skipOne } from "./actions";

type Row = {
  id: string;
  type: string;
  status: string;
  participant: string;
  email: string;
  deliverable: string;
  program: string;
  scheduledFor: string;
  error: string | null;
};

const STATUS_VARIANT: Record<string, BadgeProps["variant"]> = {
  DRAFT: "muted",
  APPROVED: "secondary",
  SENT: "success",
  FAILED: "destructive",
  SKIPPED: "outline",
};
const TYPE_VARIANT: Record<string, BadgeProps["variant"]> = {
  UPCOMING: "secondary",
  DUE_TODAY: "warning",
  OVERDUE: "destructive",
};

export function ReminderQueue({ rows, isAdmin }: { rows: Row[]; isAdmin: boolean }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const draftIds = rows.filter((r) => r.status === "DRAFT").map((r) => r.id);
  const allDraftsSelected = draftIds.length > 0 && draftIds.every((id) => selected.has(id));

  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAll = () =>
    setSelected(allDraftsSelected ? new Set() : new Set(draftIds));

  const run = (fn: () => Promise<{ error?: string } | void>, successMsg?: string) =>
    startTransition(async () => {
      setMsg(null);
      const res = await fn();
      if (res?.error) setMsg(res.error);
      else if (successMsg) setMsg(successMsg);
    });

  if (rows.length === 0) {
    return (
      <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
        No reminders. Use “Generate drafts now” to scan due dates.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {isAdmin && (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            disabled={pending || selected.size === 0}
            onClick={() =>
              run(() => approveSelected([...selected]), "Approved & sent.")
            }
          >
            Approve &amp; send selected ({selected.size})
          </Button>
          {msg && <span className="text-sm text-muted-foreground">{msg}</span>}
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {isAdmin && (
                <TableHead className="w-8">
                  <input
                    type="checkbox"
                    aria-label="Select all drafts"
                    checked={allDraftsSelected}
                    onChange={toggleAll}
                    disabled={draftIds.length === 0}
                  />
                </TableHead>
              )}
              <TableHead>Type</TableHead>
              <TableHead>Participant</TableHead>
              <TableHead>Deliverable</TableHead>
              <TableHead>Scheduled</TableHead>
              <TableHead>Status</TableHead>
              {isAdmin && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                {isAdmin && (
                  <TableCell>
                    <input
                      type="checkbox"
                      aria-label={`Select reminder for ${r.participant}`}
                      checked={selected.has(r.id)}
                      onChange={() => toggle(r.id)}
                      disabled={r.status !== "DRAFT"}
                    />
                  </TableCell>
                )}
                <TableCell>
                  <Badge variant={TYPE_VARIANT[r.type]}>{r.type.replace("_", " ")}</Badge>
                </TableCell>
                <TableCell>
                  <div className="font-medium">{r.participant}</div>
                  <div className="text-xs text-muted-foreground">{r.email}</div>
                </TableCell>
                <TableCell>
                  <div>{r.deliverable}</div>
                  <div className="text-xs text-muted-foreground">{r.program}</div>
                </TableCell>
                <TableCell className="text-muted-foreground">{r.scheduledFor}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[r.status]}>{r.status}</Badge>
                  {r.error && <div className="text-xs text-destructive">{r.error}</div>}
                </TableCell>
                {isAdmin && (
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      {r.status === "DRAFT" && (
                        <Link
                          href={`/reminders/${r.id}/edit`}
                          className={buttonVariants({ variant: "outline", size: "sm" })}
                        >
                          Edit
                        </Link>
                      )}
                      {(r.status === "DRAFT" || r.status === "APPROVED") && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={pending}
                          onClick={() => run(() => sendOne(r.id), "Sent.")}
                        >
                          Send
                        </Button>
                      )}
                      {r.status === "FAILED" && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={pending}
                          onClick={() => run(() => sendOne(r.id), "Resent.")}
                        >
                          Resend
                        </Button>
                      )}
                      {r.status === "DRAFT" && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={pending}
                          onClick={() => run(() => skipOne(r.id))}
                        >
                          Skip
                        </Button>
                      )}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
