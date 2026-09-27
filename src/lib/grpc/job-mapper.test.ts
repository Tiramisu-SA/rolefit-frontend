import { describe, expect, it } from "vitest";
import { GRPC_STATUS, grpcErrorToApiError, toJobPosting, toProtoJobInput, toProtoStatus, toResumeTemplateInfo } from "./job-mapper";
import type { JobPostingInput } from "@/lib/types";

// A Job message as @grpc/proto-loader decodes it (keepCase, enums: String, defaults: true).
const PROTO_JOB = {
  id: "job_1",
  title: "Backend",
  description: "Build services",
  status: "JOB_STATUS_OPEN",
  created_at: "2026-09-20T10:30:00.000Z",
  updated_at: "2026-09-21T06:00:00.000Z",
  recruiter_id: "user_1",
  company_id: "co-brightline",
  requirements: {
    required_skills: [{ name: "Python", level: "SKILL_LEVEL_INTERMEDIATE", minimum_years: 1 }],
    preferred_skills: [{ name: "Docker", level: "SKILL_LEVEL_BASIC" }],
    minimum_experience_years: 1,
    education_level: "EDUCATION_LEVEL_BACHELOR",
    accepted_fields: ["Computer Science"],
  },
  responsibilities: ["Write tests"],
  employment_type: "EMPLOYMENT_TYPE_FULL_TIME",
  work_arrangement: "WORK_ARRANGEMENT_HYBRID",
  location: { country: "Thailand", province: "Bangkok", district: "" },
  salary: { minimum: 35000, currency: "THB", visible: true, _minimum: "minimum" },
  application_settings: {
    application_deadline: "2026-10-31T16:59:59.000Z",
    positions_available: 2,
    resume_template_id: "",
    require_cover_letter: false,
  },
  published_at: "2026-09-21T06:00:00.000Z",
};

describe("toJobPosting", () => {
  it("strips enum prefixes and turns empty strings into undefined", () => {
    expect(toJobPosting(PROTO_JOB)).toEqual({
      id: "job_1",
      recruiterId: "user_1",
      companyId: "co-brightline",
      title: "Backend",
      description: "Build services",
      requirements: {
        requiredSkills: [{ name: "Python", level: "INTERMEDIATE", minimumYears: 1 }],
        preferredSkills: [{ name: "Docker", level: "BASIC" }],
        minimumExperienceYears: 1,
        educationLevel: "BACHELOR",
        acceptedFields: ["Computer Science"],
      },
      responsibilities: ["Write tests"],
      employmentType: "FULL_TIME",
      workArrangement: "HYBRID",
      location: { country: "Thailand", province: "Bangkok" },
      salary: { minimum: 35000, currency: "THB", visible: true },
      applicationSettings: {
        applicationDeadline: "2026-10-31T16:59:59.000Z",
        positionsAvailable: 2,
        requireCoverLetter: false,
      },
      status: "OPEN",
      publishedAt: "2026-09-21T06:00:00.000Z",
      createdAt: "2026-09-20T10:30:00.000Z",
      updatedAt: "2026-09-21T06:00:00.000Z",
    });
  });

  it("maps UNSPECIFIED enums to undefined", () => {
    const job = toJobPosting({ ...PROTO_JOB, employment_type: "EMPLOYMENT_TYPE_UNSPECIFIED", published_at: "" });
    expect(job.employmentType).toBeUndefined();
    expect(job.publishedAt).toBeUndefined();
  });
});

describe("toProtoJobInput", () => {
  it("adds enum prefixes and sends unset values as proto defaults", () => {
    const input: JobPostingInput = {
      title: "Backend",
      description: "",
      requirements: {
        requiredSkills: [{ name: "Go", level: "ADVANCED", minimumYears: 3 }],
        preferredSkills: [],
        minimumExperienceYears: 3,
        educationLevel: "NONE",
        acceptedFields: [],
      },
      responsibilities: [],
      employmentType: undefined,
      workArrangement: "REMOTE",
      location: { country: "Thailand" },
      salary: { maximum: 90000, currency: "THB", visible: false },
      applicationDeadline: undefined,
      positionsAvailable: 1,
      requireCoverLetter: true,
    };
    expect(toProtoJobInput(input)).toEqual({
      title: "Backend",
      description: "",
      requirements: {
        required_skills: [{ name: "Go", level: "SKILL_LEVEL_ADVANCED", minimum_years: 3 }],
        preferred_skills: [],
        minimum_experience_years: 3,
        education_level: "EDUCATION_LEVEL_NONE",
        accepted_fields: [],
      },
      responsibilities: [],
      employment_type: "EMPLOYMENT_TYPE_UNSPECIFIED",
      work_arrangement: "WORK_ARRANGEMENT_REMOTE",
      location: { country: "Thailand", province: "", district: "" },
      salary: { maximum: 90000, currency: "THB", visible: false },
      application_deadline: "",
      positions_available: 1,
      require_cover_letter: true,
    });
  });
});

describe("toProtoStatus", () => {
  it("prefixes a status and sends UNSPECIFIED for none", () => {
    expect(toProtoStatus("OPEN")).toBe("JOB_STATUS_OPEN");
    expect(toProtoStatus(undefined)).toBe("JOB_STATUS_UNSPECIFIED");
  });
});

describe("toResumeTemplateInfo", () => {
  it("maps the metadata and parses the int64 size", () => {
    expect(
      toResumeTemplateInfo({ id: "template_1", job_id: "job_1", file_name: "Standard.pdf", content_type: "application/pdf", size_bytes: "1234", created_at: "2026-09-27T00:00:00.000Z" }),
    ).toEqual({ id: "template_1", fileName: "Standard.pdf", contentType: "application/pdf", sizeBytes: 1234, createdAt: "2026-09-27T00:00:00.000Z" });
  });
});

function grpcError(code: number, details: string, metadata: Record<string, string> = {}) {
  return { code, details, metadata: { get: (key: string) => (key in metadata ? [metadata[key]] : []) } };
}

describe("grpcErrorToApiError", () => {
  it("maps each status to a code and keeps the service message", () => {
    expect(grpcErrorToApiError(grpcError(GRPC_STATUS.NOT_FOUND, "Job not found"))).toMatchObject({ code: "NOT_FOUND", message: "Job not found", status: 404 });
    expect(grpcErrorToApiError(grpcError(GRPC_STATUS.FAILED_PRECONDITION, "Only draft jobs can be deleted"))).toMatchObject({ code: "INVALID_STATE", status: 409 });
    expect(grpcErrorToApiError(grpcError(GRPC_STATUS.PERMISSION_DENIED, "Other company"))).toMatchObject({ code: "FORBIDDEN", status: 403 });
    expect(grpcErrorToApiError(grpcError(GRPC_STATUS.UNAUTHENTICATED, "Sign in"))).toMatchObject({ code: "UNAUTHENTICATED", status: 401 });
  });

  it("reads field errors from x-validation-errors", () => {
    const err = grpcErrorToApiError(
      grpcError(GRPC_STATUS.INVALID_ARGUMENT, "title: Is required", {
        "x-validation-errors": JSON.stringify([{ field: "title", message: "Is required" }]),
      }),
    );
    expect(err.code).toBe("VALIDATION_ERROR");
    expect(err.fieldErrors).toEqual([{ field: "title", message: "Is required" }]);
  });

  it("ignores unreadable x-validation-errors", () => {
    const err = grpcErrorToApiError(grpcError(GRPC_STATUS.INVALID_ARGUMENT, "bad", { "x-validation-errors": "{not json" }));
    expect(err.fieldErrors).toBeUndefined();
  });

  it("turns UNAVAILABLE and DEADLINE_EXCEEDED into SERVICE_UNAVAILABLE", () => {
    for (const code of [GRPC_STATUS.UNAVAILABLE, GRPC_STATUS.DEADLINE_EXCEEDED]) {
      expect(grpcErrorToApiError(grpcError(code, "connect ECONNREFUSED 127.0.0.1:50052"))).toMatchObject({
        code: "SERVICE_UNAVAILABLE",
        message: "Job service is unavailable. Please try again.",
      });
    }
  });

  it("hides the details of unexpected errors", () => {
    expect(grpcErrorToApiError(grpcError(GRPC_STATUS.INTERNAL, "stack trace..."))).toMatchObject({
      code: "INTERNAL",
      message: "Something went wrong with the job service. Please try again.",
    });
  });
});
