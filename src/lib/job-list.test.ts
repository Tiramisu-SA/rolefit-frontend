import { describe, expect, it } from "vitest";
import { emptyReason, jobsForTab } from "./job-list";
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
