import { describe, expect, it } from "vitest";
import { applicationState } from "./deadline";

const NOW = new Date("2026-11-07T12:00:00.000Z");

describe("applicationState", () => {
  it("is open for an OPEN job with a future deadline", () => {
    expect(applicationState("OPEN", "2026-11-08T00:00:00.000Z", NOW)).toBe("open");
  });

  it("is open for an OPEN job without a deadline", () => {
    expect(applicationState("OPEN", undefined, NOW)).toBe("open");
    expect(applicationState("OPEN", "", NOW)).toBe("open");
  });

  it("is deadline-passed for an OPEN job whose deadline is over", () => {
    expect(applicationState("OPEN", "2026-10-20T00:00:00.000Z", NOW)).toBe("deadline-passed");
  });

  it("is closed for a job that is not OPEN, whatever the deadline", () => {
    expect(applicationState("CLOSED", "2026-12-01T00:00:00.000Z", NOW)).toBe("closed");
    expect(applicationState("CLOSED", "2026-10-20T00:00:00.000Z", NOW)).toBe("closed");
  });

  it("treats an unparseable deadline as no deadline", () => {
    expect(applicationState("OPEN", "not a date", NOW)).toBe("open");
  });
});
