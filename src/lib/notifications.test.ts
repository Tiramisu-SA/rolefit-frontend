import { describe, expect, it } from "vitest";
import { badgeLabel, bellAriaLabel, internalLink, relativeTime } from "./notifications";

describe("notifications formatting", () => {
  it("hides the badge at 0 and caps at 9+", () => {
    expect(badgeLabel(0)).toBe("");
    expect(badgeLabel(1)).toBe("1");
    expect(badgeLabel(9)).toBe("9");
    expect(badgeLabel(10)).toBe("9+");
  });

  it("builds the aria-label", () => {
    expect(bellAriaLabel(3)).toBe("Notifications, 3 unread");
    expect(bellAriaLabel(0)).toBe("Notifications, 0 unread");
  });

  it("formats relative time", () => {
    const now = new Date("2026-11-08T12:00:00Z");
    expect(relativeTime("2026-11-08T11:59:30Z", now)).toBe("just now");
    expect(relativeTime("2026-11-08T11:55:00Z", now)).toBe("5m ago");
    expect(relativeTime("2026-11-08T09:00:00Z", now)).toBe("3h ago");
    expect(relativeTime("2026-11-06T12:00:00Z", now)).toBe("2d ago");
    expect(relativeTime("garbage", now)).toBe("");
  });

  it("keeps only internal links", () => {
    const fb = "/seeker/applications";
    for (const bad of ["//x", "https://x", "javascript:x", "/\\x", ""]) expect(internalLink(bad)).toBe(fb);
    expect(internalLink("/seeker/jobs/1")).toBe("/seeker/jobs/1");
  });
});
