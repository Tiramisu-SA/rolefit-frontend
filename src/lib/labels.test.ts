import { describe, expect, it } from "vitest";
import {
  EDUCATION_LEVEL_LABEL,
  EMPLOYMENT_TYPE_LABEL,
  JOB_STATUS_LABEL,
  SKILL_LEVEL_LABEL,
  WORK_ARRANGEMENT_LABEL,
  experienceLevelFor,
  formatLocation,
  formatSalary,
  requirementLines,
} from "./labels";

describe("enum labels", () => {
  it("has display text for every service value", () => {
    expect(EMPLOYMENT_TYPE_LABEL).toEqual({ FULL_TIME: "Full-time", PART_TIME: "Part-time", INTERNSHIP: "Internship", CONTRACT: "Contract" });
    expect(WORK_ARRANGEMENT_LABEL).toEqual({ ONSITE: "On-site", HYBRID: "Hybrid", REMOTE: "Remote" });
    expect(SKILL_LEVEL_LABEL).toEqual({ BASIC: "Basic", INTERMEDIATE: "Intermediate", ADVANCED: "Advanced" });
    expect(JOB_STATUS_LABEL).toEqual({ DRAFT: "Draft", OPEN: "Open", CLOSED: "Closed" });
    expect(EDUCATION_LEVEL_LABEL.BACHELOR).toBe("Bachelor's degree");
    expect(Object.keys(EDUCATION_LEVEL_LABEL)).toHaveLength(6);
  });
});

describe("formatLocation", () => {
  it("joins district, province and country, skipping blanks", () => {
    expect(formatLocation({ country: "Thailand", province: "Bangkok", district: "Pathum Wan" })).toBe("Pathum Wan, Bangkok, Thailand");
    expect(formatLocation({ province: "Chiang Mai" })).toBe("Chiang Mai");
    expect(formatLocation({})).toBe("");
  });
});

describe("experienceLevelFor", () => {
  it("maps minimum years to a level at the boundaries", () => {
    expect(experienceLevelFor(0)).toBe("Internship");
    expect(experienceLevelFor(1)).toBe("Entry level");
    expect(experienceLevelFor(2)).toBe("Entry level");
    expect(experienceLevelFor(3)).toBe("Mid level");
    expect(experienceLevelFor(4)).toBe("Mid level");
    expect(experienceLevelFor(5)).toBe("Senior");
    expect(experienceLevelFor(12)).toBe("Senior");
  });
});

describe("formatSalary", () => {
  it("returns null when the salary is hidden, even with amounts", () => {
    expect(formatSalary({ minimum: 30000, maximum: 50000, currency: "THB", visible: false })).toBeNull();
  });

  it("says not listed when there are no amounts", () => {
    expect(formatSalary({ currency: "THB", visible: true })).toBe("Salary not listed");
  });

  it("formats a range, a minimum only and a maximum only", () => {
    expect(formatSalary({ minimum: 35000, maximum: 50000, currency: "THB", visible: true })).toBe("฿35,000 – 50,000 / mo");
    expect(formatSalary({ minimum: 35000, currency: "THB", visible: true })).toBe("฿35,000+ / mo");
    expect(formatSalary({ maximum: 50000, currency: "THB", visible: true })).toBe("Up to ฿50,000 / mo");
  });

  it("uses the currency code for currencies other than THB", () => {
    expect(formatSalary({ minimum: 3000, maximum: 4000, currency: "USD", visible: true })).toBe("USD 3,000 – 4,000 / mo");
  });
});

describe("requirementLines", () => {
  it("describes required skills, experience and education, and preferred skills", () => {
    const lines = requirementLines({
      requiredSkills: [
        { name: "Python", level: "INTERMEDIATE", minimumYears: 1 },
        { name: "PostgreSQL", level: "BASIC", minimumYears: 0 },
      ],
      preferredSkills: [{ name: "Docker", level: "BASIC" }],
      minimumExperienceYears: 2,
      educationLevel: "BACHELOR",
      acceptedFields: ["Computer Engineering", "Computer Science", "Software Engineering"],
    });
    expect(lines.required).toEqual([
      "Python · Intermediate · 1+ year",
      "PostgreSQL · Basic",
      "Experience: 2+ years",
      "Education: Bachelor's degree in Computer Engineering, Computer Science or Software Engineering",
    ]);
    expect(lines.preferred).toEqual(["Docker · Basic"]);
  });

  it("leaves out experience and education when not required", () => {
    const lines = requirementLines({
      requiredSkills: [],
      preferredSkills: [],
      minimumExperienceYears: 0,
      educationLevel: "NONE",
      acceptedFields: [],
    });
    expect(lines).toEqual({ required: [], preferred: [] });
  });
});
