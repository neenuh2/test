import { describe, it, expect } from "vitest";
import { daysUntilDue, planReminder } from "@/lib/rules/reminders";
import { renderTemplate, DEFAULT_TEMPLATES } from "@/lib/email/templates";

const TZ = "Asia/Manila";
const config = { upcomingOffsets: [3, 1], overdueIntervalDays: 2, overdueMaxCount: 3 };

describe("daysUntilDue", () => {
  it("computes positive days before due", () => {
    expect(daysUntilDue(new Date("2026-01-10T00:00:00Z"), new Date("2026-01-07T00:00:00Z"), TZ)).toBe(3);
  });
  it("is 0 on the due date", () => {
    expect(daysUntilDue(new Date("2026-01-10T00:00:00Z"), new Date("2026-01-10T00:00:00Z"), TZ)).toBe(0);
  });
  it("is negative when overdue", () => {
    expect(daysUntilDue(new Date("2026-01-10T00:00:00Z"), new Date("2026-01-16T00:00:00Z"), TZ)).toBe(-6);
  });
});

describe("planReminder", () => {
  it("returns UPCOMING only on configured offsets", () => {
    expect(planReminder({ daysUntilDue: 3, isRequired: true, config })).toBe("UPCOMING");
    expect(planReminder({ daysUntilDue: 1, isRequired: false, config })).toBe("UPCOMING");
    expect(planReminder({ daysUntilDue: 2, isRequired: true, config })).toBeNull();
  });
  it("returns DUE_TODAY on the due date", () => {
    expect(planReminder({ daysUntilDue: 0, isRequired: false, config })).toBe("DUE_TODAY");
  });
  it("returns OVERDUE for required items on interval multiples up to the max", () => {
    expect(planReminder({ daysUntilDue: -2, isRequired: true, config })).toBe("OVERDUE"); // occ 1
    expect(planReminder({ daysUntilDue: -4, isRequired: true, config })).toBe("OVERDUE"); // occ 2
    expect(planReminder({ daysUntilDue: -6, isRequired: true, config })).toBe("OVERDUE"); // occ 3
    expect(planReminder({ daysUntilDue: -8, isRequired: true, config })).toBeNull(); // occ 4 > max
    expect(planReminder({ daysUntilDue: -3, isRequired: true, config })).toBeNull(); // not a multiple
  });
  it("never sends OVERDUE for optional deliverables", () => {
    expect(planReminder({ daysUntilDue: -2, isRequired: false, config })).toBeNull();
  });
});

describe("renderTemplate", () => {
  it("substitutes known variables and leaves unknown intact", () => {
    const out = renderTemplate("Hi {{participantName}}, due {{dueDate}}. {{missing}}", {
      participantName: "Ana",
      dueDate: "10 Jan 2026",
    });
    expect(out).toBe("Hi Ana, due 10 Jan 2026. {{missing}}");
  });
  it("renders the default UPCOMING subject with the deliverable and date", () => {
    const subject = renderTemplate(DEFAULT_TEMPLATES.UPCOMING.subject, {
      deliverable: "Capstone",
      dueDate: "10 Jan 2026",
    });
    expect(subject).toBe("Reminder: Capstone is due on 10 Jan 2026");
  });
});
