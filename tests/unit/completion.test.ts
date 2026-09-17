import { describe, it, expect } from "vitest";
import { computeCompletion } from "@/lib/rules/completion";

describe("computeCompletion", () => {
  it("completes when attendance meets threshold and all required are satisfied", () => {
    const r = computeCompletion({
      attendanceRate: 0.9,
      threshold: 0.8,
      requiredSatisfied: [true, true],
    });
    expect(r).toEqual({ meetsAttendance: true, meetsDeliverables: true, completed: true });
  });

  it("fails when attendance is below threshold", () => {
    const r = computeCompletion({
      attendanceRate: 0.75,
      threshold: 0.8,
      requiredSatisfied: [true],
    });
    expect(r.meetsAttendance).toBe(false);
    expect(r.completed).toBe(false);
  });

  it("fails when a required deliverable is unsatisfied", () => {
    const r = computeCompletion({
      attendanceRate: 1,
      threshold: 0.8,
      requiredSatisfied: [true, false],
    });
    expect(r.meetsDeliverables).toBe(false);
    expect(r.completed).toBe(false);
  });

  it("treats no required deliverables as satisfied (attendance decides)", () => {
    expect(
      computeCompletion({ attendanceRate: 0.8, threshold: 0.8, requiredSatisfied: [] }).completed
    ).toBe(true);
  });

  it("treats threshold as inclusive (>=)", () => {
    expect(
      computeCompletion({ attendanceRate: 0.8, threshold: 0.8, requiredSatisfied: [true] }).completed
    ).toBe(true);
  });
});
