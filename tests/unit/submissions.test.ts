import { describe, it, expect } from "vitest";
import {
  autoFlagStatus,
  effectiveSubmissionState,
  isSubmissionSatisfied,
} from "@/lib/rules/submissions";

const due = new Date("2026-01-10T00:00:00Z");

describe("autoFlagStatus", () => {
  it("flags a submitted item LATE when submitted after the due date", () => {
    expect(autoFlagStatus("SUBMITTED", new Date("2026-01-12T00:00:00Z"), due)).toBe("LATE");
  });
  it("keeps SUBMITTED when on time", () => {
    expect(autoFlagStatus("SUBMITTED", new Date("2026-01-09T00:00:00Z"), due)).toBe("SUBMITTED");
  });
  it("does not downgrade ACCEPTED or touch other statuses", () => {
    expect(autoFlagStatus("ACCEPTED", new Date("2026-02-01T00:00:00Z"), due)).toBe("ACCEPTED");
    expect(autoFlagStatus("RESUBMIT", null, due)).toBe("RESUBMIT");
    expect(autoFlagStatus("SUBMITTED", new Date("2026-01-12T00:00:00Z"), null)).toBe("SUBMITTED");
  });
});

describe("effectiveSubmissionState", () => {
  it("surfaces OVERDUE for a not-submitted, past-due item", () => {
    expect(
      effectiveSubmissionState("NOT_SUBMITTED", due, new Date("2026-01-15T00:00:00Z"))
    ).toBe("OVERDUE");
  });
  it("stays NOT_SUBMITTED before the due date or with no due date", () => {
    expect(
      effectiveSubmissionState("NOT_SUBMITTED", due, new Date("2026-01-05T00:00:00Z"))
    ).toBe("NOT_SUBMITTED");
    expect(effectiveSubmissionState("NOT_SUBMITTED", null, new Date())).toBe("NOT_SUBMITTED");
  });
  it("passes through submitted/accepted states", () => {
    expect(effectiveSubmissionState("ACCEPTED", due, new Date("2026-02-01Z"))).toBe("ACCEPTED");
  });
});

describe("isSubmissionSatisfied", () => {
  it("counts submitted/late/accepted", () => {
    expect(isSubmissionSatisfied("SUBMITTED")).toBe(true);
    expect(isSubmissionSatisfied("LATE")).toBe(true);
    expect(isSubmissionSatisfied("ACCEPTED")).toBe(true);
  });
  it("rejects not-submitted/resubmit", () => {
    expect(isSubmissionSatisfied("NOT_SUBMITTED")).toBe(false);
    expect(isSubmissionSatisfied("RESUBMIT")).toBe(false);
  });
});
