import { describe, expect, it } from "vitest";
import { emptyJobInput, errorMap, fromDateTimeInput, jobToInput, toDateTimeInput, validateJobForm } from "./validation";
import type { JobPosting, JobPostingInput } from "@/lib/types";

const NOW = new Date("2026-09-27T00:00:00.000Z");

function complete(overrides: Partial<JobPostingInput> = {}): JobPostingInput {
  return {
    ...emptyJobInput(),
    title: "Backend Engineer",
    description: "Build services",
    requirements: {
      requiredSkills: [{ name: "Python", level: "INTERMEDIATE", minimumYears: 1 }],
      preferredSkills: [{ name: "Docker", level: "BASIC" }],
      minimumExperienceYears: 1,
      educationLevel: "BACHELOR",
      acceptedFields: [],
    },
    employmentType: "FULL_TIME",
    workArrangement: "HYBRID",
    location: { country: "Thailand", province: "Bangkok" },
    applicationDeadline: "2026-10-31T16:59:59.000Z",
    ...overrides,
  };
}

const fields = (errors: { field: string }[]) => errors.map((e) => e.field);

describe("validateJobForm", () => {
  it("a draft only needs a title", () => {
    expect(validateJobForm({ ...emptyJobInput(), title: "Backend" }, { forPublish: false, now: NOW })).toEqual([]);
    expect(fields(validateJobForm(emptyJobInput(), { forPublish: false, now: NOW }))).toEqual(["title"]);
  });

  it("publishing needs description, a required skill, employment, arrangement, country and province", () => {
    const errors = validateJobForm({ ...emptyJobInput(), title: "Backend" }, { forPublish: true, now: NOW });
    expect(fields(errors)).toEqual([
      "description",
      "requirements.requiredSkills",
      "employmentType",
      "workArrangement",
      "location.country",
      "location.province",
    ]);
    expect(validateJobForm(complete(), { forPublish: true, now: NOW })).toEqual([]);
  });

  it("rejects a minimum salary above the maximum", () => {
    const input = complete({ salary: { minimum: 60000, maximum: 40000, currency: "THB", visible: true } });
    expect(fields(validateJobForm(input, { forPublish: false, now: NOW }))).toEqual(["salary.maximum"]);
  });

  it("rejects the same skill twice, ignoring case, within and across lists", () => {
    const input = complete({
      requirements: {
        ...complete().requirements,
        requiredSkills: [
          { name: "Python", level: "BASIC", minimumYears: 0 },
          { name: "python", level: "BASIC", minimumYears: 0 },
        ],
        preferredSkills: [{ name: "PYTHON", level: "BASIC" }],
      },
    });
    expect(fields(validateJobForm(input, { forPublish: false, now: NOW }))).toEqual([
      "requirements.requiredSkills[1].name",
      "requirements.preferredSkills[0].name",
    ]);
  });

  it("requires skill names and keeps years in range", () => {
    const input = complete({
      requirements: { ...complete().requirements, requiredSkills: [{ name: " ", level: "BASIC", minimumYears: 60 }] },
    });
    expect(fields(validateJobForm(input, { forPublish: false, now: NOW }))).toEqual([
      "requirements.requiredSkills[0].name",
      "requirements.requiredSkills[0].minimumYears",
    ]);
  });

  it("rejects a past deadline only when publishing", () => {
    const input = complete({ applicationDeadline: "2026-09-01T00:00:00.000Z" });
    expect(validateJobForm(input, { forPublish: false, now: NOW })).toEqual([]);
    expect(fields(validateJobForm(input, { forPublish: true, now: NOW }))).toEqual(["applicationDeadline"]);
  });

  it("keeps positions between 1 and 1000", () => {
    expect(fields(validateJobForm(complete({ positionsAvailable: 0 }), { forPublish: false, now: NOW }))).toEqual(["positionsAvailable"]);
  });
});

describe("errorMap", () => {
  it("keys errors by path and maps the service's applicationSettings paths to the form fields", () => {
    expect(
      errorMap([
        { field: "title", message: "Is required" },
        { field: "applicationSettings.applicationDeadline", message: "The deadline has already passed" },
        { field: "applicationSettings.positionsAvailable", message: "At least 1 position" },
      ]),
    ).toEqual({
      title: "Is required",
      applicationDeadline: "The deadline has already passed",
      positionsAvailable: "At least 1 position",
    });
  });
});

describe("jobToInput", () => {
  it("copies the editable fields of a job", () => {
    const job: JobPosting = {
      id: "job_1",
      recruiterId: "u",
      companyId: "co",
      status: "OPEN",
      createdAt: "2026-09-20T00:00:00.000Z",
      updatedAt: "2026-09-20T00:00:00.000Z",
      title: "T",
      description: "D",
      requirements: complete().requirements,
      responsibilities: ["R"],
      employmentType: "CONTRACT",
      workArrangement: "REMOTE",
      location: { country: "Thailand" },
      salary: { minimum: 1, currency: "THB", visible: false },
      applicationSettings: { applicationDeadline: "2026-10-01T00:00:00.000Z", positionsAvailable: 3, resumeTemplateId: "template_1", requireCoverLetter: true },
    };
    expect(jobToInput(job)).toEqual({
      title: "T",
      description: "D",
      requirements: complete().requirements,
      responsibilities: ["R"],
      employmentType: "CONTRACT",
      workArrangement: "REMOTE",
      location: { country: "Thailand" },
      salary: { minimum: 1, currency: "THB", visible: false },
      applicationDeadline: "2026-10-01T00:00:00.000Z",
      positionsAvailable: 3,
      requireCoverLetter: true,
    });
  });
});

describe("datetime-local helpers", () => {
  it("round-trips an ISO time through the local input format", () => {
    const iso = "2026-10-31T16:59:00.000Z";
    expect(fromDateTimeInput(toDateTimeInput(iso))).toBe(iso);
    expect(toDateTimeInput(undefined)).toBe("");
    expect(fromDateTimeInput("")).toBeUndefined();
  });
});
