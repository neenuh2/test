import { describe, it, expect } from "vitest";
import type { AttendanceStatus } from "@prisma/client";
import {
  moduleAppliesToCohort,
  computeAttendanceStats,
  computeModulesMissed,
} from "@/lib/rules/attendance";

describe("moduleAppliesToCohort", () => {
  it("applies to all cohorts when unscoped", () => {
    expect(moduleAppliesToCohort([], "c1")).toBe(true);
  });
  it("applies only to scoped cohorts", () => {
    expect(moduleAppliesToCohort(["c1", "c2"], "c1")).toBe(true);
    expect(moduleAppliesToCohort(["c1", "c2"], "c3")).toBe(false);
  });
});

describe("computeAttendanceStats", () => {
  const status = (entries: [string, AttendanceStatus][]) =>
    new Map<string, AttendanceStatus>(entries);

  it("counts present/late as attended and excludes excused from the denominator", () => {
    const s = computeAttendanceStats({
      applicableSessionIds: ["s1", "s2", "s3", "s4"],
      statusBySession: status([
        ["s1", "PRESENT"],
        ["s2", "LATE"],
        ["s3", "EXCUSED"],
        ["s4", "ABSENT"],
      ]),
    });
    expect(s).toMatchObject({ applicable: 4, attended: 2, excused: 1, absent: 1, unrecorded: 0 });
    // denom = 4 - 1 excused = 3; attended 2 → 2/3
    expect(s.rate).toBeCloseTo(2 / 3, 5);
  });

  it("treats unrecorded applicable sessions as not attended", () => {
    const s = computeAttendanceStats({
      applicableSessionIds: ["s1", "s2"],
      statusBySession: status([["s1", "PRESENT"]]),
    });
    expect(s.unrecorded).toBe(1);
    expect(s.rate).toBeCloseTo(0.5, 5);
  });

  it("returns rate 1 when all applicable sessions are excused or none exist", () => {
    expect(
      computeAttendanceStats({
        applicableSessionIds: ["s1"],
        statusBySession: status([["s1", "EXCUSED"]]),
      }).rate
    ).toBe(1);
    expect(
      computeAttendanceStats({ applicableSessionIds: [], statusBySession: new Map() }).rate
    ).toBe(1);
  });
});

describe("computeModulesMissed", () => {
  const status = (entries: [string, AttendanceStatus][]) =>
    new Map<string, AttendanceStatus>(entries);

  it("flags a module missed only when no session is present/late/excused", () => {
    const missed = computeModulesMissed({
      moduleSessionIds: new Map([
        ["mAttended", ["a1", "a2"]],
        ["mExcused", ["e1"]],
        ["mAbsent", ["x1", "x2"]],
        ["mUnrecorded", ["u1"]],
      ]),
      statusBySession: status([
        ["a1", "ABSENT"],
        ["a2", "PRESENT"], // attended at least one → not missed
        ["e1", "EXCUSED"], // covered → not missed
        ["x1", "ABSENT"],
        ["x2", "ABSENT"], // all absent → missed
        // u1 has no record → missed
      ]),
    });
    expect(missed.sort()).toEqual(["mAbsent", "mUnrecorded"]);
  });

  it("ignores modules with no scheduled sessions", () => {
    const missed = computeModulesMissed({
      moduleSessionIds: new Map([["m1", []]]),
      statusBySession: new Map(),
    });
    expect(missed).toEqual([]);
  });
});
