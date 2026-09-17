"use client";

import { useFormState } from "react-dom";
import { emptyActionState, type ActionState } from "@/lib/action-result";
import { SubmitButton } from "@/components/form";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;
type Status = "NOT_SUBMITTED" | "SUBMITTED" | "LATE" | "RESUBMIT" | "ACCEPTED";

const STATUS_OPTIONS: { value: Status; label: string }[] = [
  { value: "NOT_SUBMITTED", label: "Not submitted" },
  { value: "SUBMITTED", label: "Submitted" },
  { value: "LATE", label: "Late" },
  { value: "RESUBMIT", label: "Resubmit" },
  { value: "ACCEPTED", label: "Accepted" },
];

export function SubmissionGrid({
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
    submittedAt: string; // yyyy-mm-dd or ""
    remarks: string;
    fileUrl: string;
  }[];
  readOnly?: boolean;
}) {
  const [state, formAction] = useFormState(action, emptyActionState);

  if (participants.length === 0) {
    return (
      <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
        No enrolled participants apply to this deliverable.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Participant</TableHead>
              <TableHead>Cohort</TableHead>
              <TableHead className="w-40">Status</TableHead>
              <TableHead className="w-40">Submitted</TableHead>
              <TableHead>File link</TableHead>
              <TableHead>Remarks</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {participants.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell className="text-muted-foreground">{p.cohortCode}</TableCell>
                <TableCell>
                  <Select name={`status:${p.id}`} defaultValue={p.status} disabled={readOnly} className="h-9">
                    {STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </Select>
                </TableCell>
                <TableCell>
                  <Input
                    type="date"
                    name={`submittedAt:${p.id}`}
                    defaultValue={p.submittedAt}
                    disabled={readOnly}
                    className="h-9"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="url"
                    name={`fileUrl:${p.id}`}
                    defaultValue={p.fileUrl}
                    placeholder="https://…"
                    disabled={readOnly}
                    className="h-9"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    name={`remarks:${p.id}`}
                    defaultValue={p.remarks}
                    disabled={readOnly}
                    className="h-9"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {!readOnly && (
        <div className="flex items-center gap-3">
          <SubmitButton pendingLabel="Saving…">Save submissions</SubmitButton>
          {state.ok && <span className="text-sm text-green-600">Saved.</span>}
          {state.error && <span className="text-sm text-destructive">{state.error}</span>}
        </div>
      )}
    </form>
  );
}
