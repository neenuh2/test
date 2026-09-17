"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  previewAttendanceImport,
  commitAttendanceImport,
  type ImportResult,
  type ImportRow,
} from "./actions";

const ACTION_VARIANT: Record<ImportRow["action"], BadgeProps["variant"]> = {
  create: "success",
  update: "warning",
  reject: "destructive",
};

export function ImportClient({
  runId,
  templateCsv,
}: {
  runId: string;
  templateCsv: string;
}) {
  const [csvText, setCsvText] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [result, setResult] = useState<(ImportResult & { committed?: number }) | null>(null);
  const [committed, setCommitted] = useState(false);
  const [pending, startTransition] = useTransition();

  function downloadTemplate() {
    const blob = new Blob([templateCsv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "attendance-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    setCommitted(false);
    setCsvText(await file.text());
  }

  function preview() {
    startTransition(async () => {
      setCommitted(false);
      setResult(await previewAttendanceImport(runId, csvText));
    });
  }

  function commit() {
    startTransition(async () => {
      const res = await commitAttendanceImport(runId, csvText);
      setResult(res);
      if (!res.error) setCommitted(true);
    });
  }

  const summary = result?.summary;

  return (
    <div className="space-y-4">
      <div className="rounded-md border bg-muted/30 p-4 text-sm">
        <p className="mb-2 font-medium">How to import</p>
        <ol className="list-inside list-decimal space-y-1 text-muted-foreground">
          <li>Download the template — it is pre-filled with every applicable participant × session row.</li>
          <li>
            Fill the <code>status</code> column with one of PRESENT, LATE, EXCUSED, ABSENT.
          </li>
          <li>Upload the file and review the dry-run preview before committing.</li>
        </ol>
        <div className="mt-3">
          <Button type="button" variant="outline" size="sm" onClick={downloadTemplate}>
            Download template
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={onFile}
          className="text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1.5 file:text-sm"
        />
        <Button type="button" onClick={preview} disabled={!csvText || pending}>
          {pending ? "Working…" : "Preview"}
        </Button>
        {result?.rows && !result.error && summary && summary.create + summary.update > 0 && (
          <Button type="button" variant="default" onClick={commit} disabled={pending}>
            Commit {summary.create + summary.update} row(s)
          </Button>
        )}
        {fileName && <span className="text-xs text-muted-foreground">{fileName}</span>}
      </div>

      {result?.error && <p className="text-sm text-destructive">{result.error}</p>}

      {committed && result?.committed != null && (
        <p className="rounded-md border border-green-600/30 bg-green-600/10 px-3 py-2 text-sm text-green-700">
          Imported {result.committed} attendance record(s) successfully.
        </p>
      )}

      {summary && (
        <div className="flex flex-wrap gap-2 text-sm">
          <Badge variant="success">{summary.create} create</Badge>
          <Badge variant="warning">{summary.update} update</Badge>
          <Badge variant="destructive">{summary.reject} reject</Badge>
          <Badge variant="muted">{summary.total} total</Badge>
        </div>
      )}

      {result?.rows && result.rows.length > 0 && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Line</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Module</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.rows.map((r) => (
                <TableRow key={r.line}>
                  <TableCell className="text-muted-foreground">{r.line}</TableCell>
                  <TableCell>
                    {r.participantName ?? r.employeeId}
                  </TableCell>
                  <TableCell>{r.moduleTitle}</TableCell>
                  <TableCell>{r.sessionDate}</TableCell>
                  <TableCell>{r.status}</TableCell>
                  <TableCell>
                    <Badge variant={ACTION_VARIANT[r.action]}>{r.action}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.reason ?? ""}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
