import { describe, it, expect } from "vitest";
import { resolveDueDate } from "@/lib/rules/due-dates";

describe("resolveDueDate", () => {
  const runStartDate = new Date("2026-01-01T00:00:00.000Z");

  it("prefers an explicit override over the offset", () => {
    const override = new Date("2026-02-15T00:00:00.000Z");
    expect(
      resolveDueDate({ dueOffsetDays: 7, runStartDate, overrideDueDate: override })
    ).toEqual(override);
  });

  it("computes from dueOffsetDays when no override", () => {
    const result = resolveDueDate({ dueOffsetDays: 10, runStartDate });
    expect(result?.toISOString()).toBe("2026-01-11T00:00:00.000Z");
  });

  it("returns null when neither offset nor override is set", () => {
    expect(resolveDueDate({ dueOffsetDays: null, runStartDate })).toBeNull();
  });
});
