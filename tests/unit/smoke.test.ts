import { describe, it, expect } from "vitest";
import { isAdmin } from "@/lib/rbac";

// Phase 0 smoke test — proves the test runner and path alias resolution work.
// Business-rule unit tests (completion, due-date evaluation, late-flagging)
// arrive with their logic in Phases 3–4.
describe("rbac.isAdmin", () => {
  it("returns true only for ADMIN", () => {
    expect(isAdmin("ADMIN")).toBe(true);
    expect(isAdmin("VIEWER")).toBe(false);
    expect(isAdmin(null)).toBe(false);
    expect(isAdmin(undefined)).toBe(false);
  });
});
