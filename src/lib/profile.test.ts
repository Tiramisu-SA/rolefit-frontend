import { describe, expect, it } from "vitest";
import { emptyProfileDocument, profileCompleteness, profileInitials } from "./profile";
import type { CandidateProfile } from "./types";

function profile(overrides: Partial<CandidateProfile> = {}): CandidateProfile {
  return {
    id: "p1",
    name: "Pimchanok Srisuk",
    headline: null,
    summary: null,
    email: null,
    location: null,
    links: [],
    verified: false,
    totalExperienceMonths: 0,
    skills: [],
    experience: [],
    education: [],
    projects: [],
    preferences: null,
    createdAt: "2026-09-27T00:00:00.000Z",
    updatedAt: "2026-09-27T00:00:00.000Z",
    ...overrides,
  };
}

describe("profileInitials", () => {
  it("takes the first letter of the first two words", () => {
    expect(profileInitials("Pimchanok Srisuk")).toBe("PS");
    expect(profileInitials("  pim  ")).toBe("P");
    expect(profileInitials("Anna Maria de Souza")).toBe("AM");
  });

  it("falls back to ? for an empty name", () => {
    expect(profileInitials("   ")).toBe("?");
  });
});

describe("profileCompleteness", () => {
  it("is low for a name-only profile", () => {
    expect(profileCompleteness(profile())).toBe(5);
  });

  it("is 100 for a profile with every section filled", () => {
    const full = profile({
      headline: "Frontend developer",
      summary: "I build dashboards.",
      email: "p@example.com",
      location: "Bangkok",
      skills: ["React", "TypeScript", "CSS"].map((name, i) => ({ id: `s${i}`, name, proficiencyLevel: null })),
      experience: [{ id: "e1", companyName: "A", jobTitle: "Dev", startDate: "2025-01-01", endDate: null, isCurrent: true, bullets: [] }],
      education: [{ id: "d1", institutionName: "CU", degree: "B.Eng.", fieldOfStudy: null, gpa: null, year: "2026" }],
      projects: [{ id: "x1", name: "RoleFit", tech: [], bullets: [] }],
      preferences: {
        employmentTypes: ["FULL_TIME"],
        preferredRoles: [],
        workArrangements: [],
        preferredLocations: [],
        minimumSalary: null,
        salaryCurrency: null,
      },
    });
    expect(profileCompleteness(full)).toBe(100);
  });
});

describe("emptyProfileDocument", () => {
  it("is a blank document with every list empty", () => {
    expect(emptyProfileDocument()).toEqual({
      name: "",
      headline: null,
      summary: null,
      email: null,
      location: null,
      links: [],
      skills: [],
      experience: [],
      education: [],
      projects: [],
      preferences: null,
    });
  });
});
