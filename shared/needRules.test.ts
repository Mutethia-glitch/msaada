import { describe, expect, it } from "vitest";
import { canAdmin, canModerate, canTransitionLifecycle } from "./needRules";

describe("Msaada domain rules", () => {
  it("allows the documented need lifecycle", () => {
    expect(canTransitionLifecycle("draft", "pending_review")).toBe(true);
    expect(canTransitionLifecycle("pending_review", "active")).toBe(true);
    expect(canTransitionLifecycle("active", "fulfilled")).toBe(true);
    expect(canTransitionLifecycle("fulfilled", "closed")).toBe(true);
    expect(canTransitionLifecycle("closed", "active")).toBe(false);
  });
  it("limits moderation and admin operations by role", () => {
    expect(canModerate("user")).toBe(false);
    expect(canModerate("moderator")).toBe(true);
    expect(canModerate("admin")).toBe(true);
    expect(canAdmin("moderator")).toBe(false);
    expect(canAdmin("admin")).toBe(true);
  });
});
