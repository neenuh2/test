import { describe, it, expect } from "vitest";
import { parseCsv, parseCsvRows, toCsv } from "@/lib/csv";

describe("parseCsv", () => {
  it("parses headers and rows", () => {
    const { headers, rows } = parseCsv("employeeId,status\nEMP0001,PRESENT\nEMP0002,ABSENT\n");
    expect(headers).toEqual(["employeeId", "status"]);
    expect(rows).toEqual([
      { employeeId: "EMP0001", status: "PRESENT" },
      { employeeId: "EMP0002", status: "ABSENT" },
    ]);
  });

  it("handles quoted fields with commas, quotes, and newlines", () => {
    const text = 'name,note\n"Doe, John","said ""hi""\nsecond line"\n';
    const rows = parseCsvRows(text);
    expect(rows[1]).toEqual(["Doe, John", 'said "hi"\nsecond line']);
  });

  it("strips a leading BOM and handles CRLF", () => {
    const { rows } = parseCsv("﻿a,b\r\n1,2\r\n");
    expect(rows).toEqual([{ a: "1", b: "2" }]);
  });
});

describe("toCsv", () => {
  it("serializes and escapes cells needing quotes", () => {
    const csv = toCsv(["a", "b"], [{ a: "plain", b: "has,comma" }, { a: 'q"x', b: "" }]);
    expect(csv).toBe('a,b\r\nplain,"has,comma"\r\n"q""x",');
  });

  it("round-trips through parseCsv", () => {
    const csv = toCsv(["x", "y"], [{ x: "1", y: "two, 2" }]);
    const { rows } = parseCsv(csv);
    expect(rows).toEqual([{ x: "1", y: "two, 2" }]);
  });
});
