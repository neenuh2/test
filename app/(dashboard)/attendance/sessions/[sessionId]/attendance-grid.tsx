"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { emptyActionState, type ActionState } from "@/lib/action-result";
import { SubmitButton } from "@/components/form";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;
type Status = "PRESENT" | "LATE" | "EXCUSED" | "ABSENT";

const STATUSES: { value: Status; label: string; key: string }[] = [
  { value: "PRESENT", label: "Present", key: "P" },
  { value: "LATE", label: "Late", key: "L" },
  { value: "EXCUSED", label: "Excused", key: "E" },
  { value: "ABSENT", label: "Absent", key: "A" },
];

export function AttendanceGrid({
  action,
  participants,
  readOnly,
}: {
  action: Action;
  participants: {
    id: string;
    name: string;
    cohortCode: string;
    status: Status;
  }[];
  readOnly?: boolean;
}) {
  const [state, formAction] = useFormState(action, emptyActionState);
  const [values, setValues] = useState<Record<string, Status>>(
    Object.fromEntries(participants.map((p) => [p.id, p.status]))
  );

  const setAll = (status: Status) =>
    setValues(Object.fromEntries(participants.map((p) => [p.id, status])));

  if (participants.length === 0) {
    return (
      <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
        No enrolled participants apply to this module.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Set all:</span>
          {STATUSES.map((s) => (
            <Button
              key={s.value}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAll(s.value)}
            >
              {s.label}
            </Button>
          ))}
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Participant</TableHead>
              <TableHead>Cohort</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {participants.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell className="text-muted-foreground">{p.cohortCode}</TableCell>
                <TableCell>
                  <fieldset
                    className="flex flex-wrap gap-1"
                    aria-label={`Attendance status for ${p.name}`}
                  >
                    {STATUSES.map((s) => {
                      const checked = values[p.id] === s.value;
                      return (
                        <label
                          key={s.value}
                          className={`cursor-pointer select-none rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                            checked
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-input hover:bg-accent"
                          } ${readOnly ? "pointer-events-none opacity-70" : ""}`}
                        >
                          <input
                            type="radio"
                            className="sr-only"
                            name={`status:${p.id}`}
                            value={s.value}
                            checked={checked}
                            disabled={readOnly}
                            onChange={() =>
                              setValues((v) => ({ ...v, [p.id]: s.value }))
                            }
                          />
                          {s.label}
                        </label>
                      );
                    })}
                  </fieldset>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {!readOnly && (
        <div className="flex items-center gap-3">
          <SubmitButton pendingLabel="Saving…">Save attendance</SubmitButton>
          {state.ok && <span className="text-sm text-green-600">Saved.</span>}
          {state.error && <span className="text-sm text-destructive">{state.error}</span>}
        </div>
      )}
    </form>
  );
}
