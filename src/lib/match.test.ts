import { describe, expect, it } from "vitest";
import { computeMatch } from "./match";
import type { CandidatePreferences, CandidateProfile, JobPosting } from "./types";

function job(overrides: Partial<JobPosting> = {}): JobPosting {
  return {
    id: "job_1",
    recruiterId: "u",
    companyId: "co-brightline",
    title: "Backend",
    description: "",
    requirements: {
      requiredSkills: [
        { name: "Python", level: "BASIC", minimumYears: 0 },
        { name: "PostgreSQL", level: "BASIC", minimumYears: 0 },
      ],
      preferredSkills: [],
      minimumExperienceYears: 2,
      educationLevel: "BACHELOR",
      acceptedFields: [],
    },
    responsibilities: [],
    employmentType: "FULL_TIME",
    workArrangement: "HYBRID",
    location: { country: "Thailand", province: "Bangkok" },
    salary: { currency: "THB", visible: true },
    applicationSettings: { positionsAvailable: 1, requireCoverLetter: false },
    status: "OPEN",
    createdAt: "2026-09-20T00:00:00.000Z",
    updatedAt: "2026-09-20T00:00:00.000Z",
    ...overrides,
  };
}

const PREFS: CandidatePreferences = {
  employmentTypes: ["FULL_TIME"],
  preferredRoles: [],
  workArrangements: ["HYBRID"],
  preferredLocations: ["bangkok"],
  minimumSalary: null,
  salaryCurrency: null,
};

function profile(overrides: Partial<CandidateProfile> = {}): CandidateProfile {
  return {
    id: "p1",
    userId: "u1",
    name: "Pim",
    headline: null,
    summary: null,
    email: null,
    location: null,
    links: [],
    verified: true,
    totalExperienceMonths: 24,
    skills: [
      { id: "s1", name: "python", proficiencyLevel: null },
      { id: "s2", name: "Go", proficiencyLevel: null },
    ],
    experience: [],
    education: [{ id: "e1", institutionName: "CU", degree: "B.Eng.", fieldOfStudy: null, gpa: null, year: null }],
    projects: [],
    preferences: PREFS,
    createdAt: "2026-09-20T00:00:00.000Z",
    updatedAt: "2026-09-20T00:00:00.000Z",
    ...overrides,
  };
}

describe("computeMatch", () => {
  it("matches required skills ignoring case", () => {
    const m = computeMatch(profile(), job());
    expect(m.matchedSkills).toEqual(["Python"]);
    expect(m.missingSkills).toEqual(["PostgreSQL"]);
    expect(m.breakdown.skills).toBe(50);
  });

  it("compares experience months with the required years", () => {
    expect(computeMatch(profile({ totalExperienceMonths: 24 }), job()).breakdown.experience).toBe(100);
    expect(computeMatch(profile({ totalExperienceMonths: 12 }), job()).breakdown.experience).toBe(50);
    const noYearsNeeded = job({ requirements: { ...job().requirements, minimumExperienceYears: 0 } });
    expect(computeMatch(profile({ totalExperienceMonths: 0 }), noYearsNeeded).breakdown.experience).toBe(100);
  });

  it("scores education 100 with any education and 50 without", () => {
    expect(computeMatch(profile(), job()).breakdown.education).toBe(100);
    expect(computeMatch(profile({ education: [] }), job()).breakdown.education).toBe(50);
  });

  it("gives preference points for arrangement (40), location (30) and employment type (30)", () => {
    expect(computeMatch(profile(), job()).breakdown.preferences).toBe(100);
    expect(computeMatch(profile(), job({ workArrangement: "ONSITE" })).breakdown.preferences).toBe(60);
    expect(computeMatch(profile(), job({ location: { province: "Chiang Mai" } })).breakdown.preferences).toBe(70);
    expect(computeMatch(profile(), job({ employmentType: "CONTRACT" })).breakdown.preferences).toBe(70);
    // A remote job counts as matching any location.
    const remote = job({ workArrangement: "REMOTE", location: { province: "Chiang Mai" } });
    expect(computeMatch(profile({ preferences: { ...PREFS, workArrangements: ["REMOTE"] } }), remote).breakdown.preferences).toBe(100);
    expect(computeMatch(profile({ preferences: null }), job()).breakdown.preferences).toBe(0);
  });

  it("weights the parts 50 / 25 / 10 / 15", () => {
    // skills 50, experience 100, education 100, preferences 100
    expect(computeMatch(profile(), job()).score).toBe(Math.round(50 * 0.5 + 100 * 0.25 + 100 * 0.1 + 100 * 0.15));
  });

  it("works without a profile and gives a low score", () => {
    const m = computeMatch(null, job());
    expect(m.score).toBeLessThan(30);
    expect(m.missingSkills).toEqual(["Python", "PostgreSQL"]);
    expect(m.candidateId).toBe("me");
  });

  it("treats a job with no required skills as a full skills match", () => {
    const m = computeMatch(profile(), job({ requirements: { ...job().requirements, requiredSkills: [] } }));
    expect(m.breakdown.skills).toBe(100);
    expect(m.explanation).toContain("no missing required skills");
  });
});
