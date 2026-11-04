import { describe, expect, it } from "vitest";
import { acceptingApplications, emptyReason, jobsForTab } from "./job-list";
import type { JobWithMatch } from "./types";

const withScore = (id: string, score: number) => ({ id, match: { score } }) as unknown as JobWithMatch;

describe("jobsForTab", () => {
  const jobs = [withScore("low", 59), withScore("edge", 60), withScore("high", 90)];

  it("hides weak matches on the Recommended tab", () => {
    expect(jobsForTab(jobs, "recommended").map((j) => j.id)).toEqual(["edge", "high"]);
  });

  it("shows every job on the All tab", () => {
    expect(jobsForTab(jobs, "all").map((j) => j.id)).toEqual(["low", "edge", "high"]);
  });
});

describe("emptyReason", () => {
  it("says there are no strong matches when jobs exist but the Recommended tab hides them all", () => {
    expect(emptyReason([withScore("low", 48)], "recommended")).toBe("no-strong-matches");
  });

  it("blames the search when no jobs came back at all", () => {
    expect(emptyReason([], "recommended")).toBe("no-results");
    expect(emptyReason([], "all")).toBe("no-results");
  });
});

describe("acceptingApplications", () => {
  const now = new Date("2026-11-04T12:00:00.000Z");
  const job = (status: "DRAFT" | "OPEN" | "CLOSED", applicationDeadline?: string) =>
    ({ status, applicationSettings: { applicationDeadline } }) as Parameters<typeof acceptingApplications>[0];

  it("accepts an open job before its deadline", () => {
    expect(acceptingApplications(job("OPEN", "2026-11-04T12:00:01.000Z"), now)).toBe(true);
  });

  it("accepts an open job with no deadline", () => {
    expect(acceptingApplications(job("OPEN"), now)).toBe(true);
  });

  it("refuses an open job at or after its deadline, like the Application Service", () => {
    expect(acceptingApplications(job("OPEN", "2026-11-04T12:00:00.000Z"), now)).toBe(false);
    expect(acceptingApplications(job("OPEN", "2026-10-20T00:00:00.000Z"), now)).toBe(false);
  });

  it("refuses a closed job even with a future deadline", () => {
    expect(acceptingApplications(job("CLOSED", "2027-01-01T00:00:00.000Z"), now)).toBe(false);
  });

  it("leaves an unreadable deadline for the server to judge", () => {
    expect(acceptingApplications(job("OPEN", "not a date"), now)).toBe(true);
  });
});
