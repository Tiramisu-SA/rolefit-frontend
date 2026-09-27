import { ApiError, type FieldError } from "@/lib/api/errors";
import type { JobPosting, JobPostingInput, JobStatus, ResumeTemplateInfo } from "@/lib/types";

// Pure mapping between the Job Posting proto messages (snake_case, prefixed
// enums, "" / UNSPECIFIED for "not set") and the frontend types. No gRPC
// imports here, so it can be unit tested and used anywhere.

/* eslint-disable @typescript-eslint/no-explicit-any */
type Msg = Record<string, any>;

/** The gRPC status codes this app cares about (from @grpc/grpc-js `status`). */
export const GRPC_STATUS = {
  INVALID_ARGUMENT: 3,
  DEADLINE_EXCEEDED: 4,
  NOT_FOUND: 5,
  PERMISSION_DENIED: 7,
  FAILED_PRECONDITION: 9,
  INTERNAL: 13,
  UNAVAILABLE: 14,
  UNAUTHENTICATED: 16,
} as const;

const PREFIX = {
  status: "JOB_STATUS_",
  level: "SKILL_LEVEL_",
  employment: "EMPLOYMENT_TYPE_",
  arrangement: "WORK_ARRANGEMENT_",
  education: "EDUCATION_LEVEL_",
} as const;

const toEnum = (prefix: string, value: string | undefined) => `${prefix}${value ?? "UNSPECIFIED"}`;

function fromEnum<T extends string>(prefix: string, value: unknown): T | undefined {
  if (typeof value !== "string" || value === "" || value === `${prefix}UNSPECIFIED`) return undefined;
  return (value.startsWith(prefix) ? value.slice(prefix.length) : value) as T;
}

const text = (value: unknown): string | undefined => (typeof value === "string" && value !== "" ? value : undefined);

/** Copies only the keys whose value is not undefined (keeps objects comparable). */
function defined<T extends object>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;
}

export function toJobPosting(msg: Msg): JobPosting {
  const r = msg.requirements ?? {};
  const s = msg.salary ?? {};
  const a = msg.application_settings ?? {};
  const loc = msg.location ?? {};
  return defined<JobPosting>({
    id: msg.id,
    recruiterId: msg.recruiter_id,
    companyId: msg.company_id,
    title: msg.title,
    description: msg.description ?? "",
    requirements: {
      requiredSkills: (r.required_skills ?? []).map((x: Msg) => ({
        name: x.name,
        level: fromEnum(PREFIX.level, x.level) ?? "BASIC",
        minimumYears: x.minimum_years ?? 0,
      })),
      preferredSkills: (r.preferred_skills ?? []).map((x: Msg) => ({ name: x.name, level: fromEnum(PREFIX.level, x.level) ?? "BASIC" })),
      minimumExperienceYears: r.minimum_experience_years ?? 0,
      educationLevel: fromEnum(PREFIX.education, r.education_level) ?? "NONE",
      acceptedFields: r.accepted_fields ?? [],
    },
    responsibilities: msg.responsibilities ?? [],
    employmentType: fromEnum(PREFIX.employment, msg.employment_type),
    workArrangement: fromEnum(PREFIX.arrangement, msg.work_arrangement),
    location: defined({ country: text(loc.country), province: text(loc.province), district: text(loc.district) }),
    salary: defined({
      minimum: typeof s.minimum === "number" ? s.minimum : undefined,
      maximum: typeof s.maximum === "number" ? s.maximum : undefined,
      currency: text(s.currency) ?? "THB",
      visible: s.visible ?? true,
    }),
    applicationSettings: defined({
      applicationDeadline: text(a.application_deadline),
      positionsAvailable: a.positions_available || 1,
      resumeTemplateId: text(a.resume_template_id),
      requireCoverLetter: Boolean(a.require_cover_letter),
    }),
    status: fromEnum<JobStatus>(PREFIX.status, msg.status) ?? "DRAFT",
    publishedAt: text(msg.published_at),
    createdAt: msg.created_at,
    updatedAt: msg.updated_at,
  });
}

export function toProtoJobInput(input: JobPostingInput): Msg {
  const salary: Msg = { currency: input.salary.currency, visible: input.salary.visible };
  if (input.salary.minimum !== undefined) salary.minimum = input.salary.minimum;
  if (input.salary.maximum !== undefined) salary.maximum = input.salary.maximum;
  return {
    title: input.title,
    description: input.description,
    requirements: {
      required_skills: input.requirements.requiredSkills.map((s) => ({
        name: s.name,
        level: toEnum(PREFIX.level, s.level),
        minimum_years: s.minimumYears,
      })),
      preferred_skills: input.requirements.preferredSkills.map((s) => ({ name: s.name, level: toEnum(PREFIX.level, s.level) })),
      minimum_experience_years: input.requirements.minimumExperienceYears,
      education_level: toEnum(PREFIX.education, input.requirements.educationLevel),
      accepted_fields: input.requirements.acceptedFields,
    },
    responsibilities: input.responsibilities,
    employment_type: toEnum(PREFIX.employment, input.employmentType),
    work_arrangement: toEnum(PREFIX.arrangement, input.workArrangement),
    location: {
      country: input.location.country ?? "",
      province: input.location.province ?? "",
      district: input.location.district ?? "",
    },
    salary,
    application_deadline: input.applicationDeadline ?? "",
    positions_available: input.positionsAvailable,
    require_cover_letter: input.requireCoverLetter,
  };
}

export const toProtoStatus = (status: JobStatus | undefined) => toEnum(PREFIX.status, status);

export function toResumeTemplateInfo(msg: Msg): ResumeTemplateInfo {
  return {
    id: msg.id,
    fileName: msg.file_name,
    contentType: msg.content_type,
    sizeBytes: Number(msg.size_bytes),
    createdAt: msg.created_at,
  };
}

interface GrpcLikeError {
  code?: number;
  details?: string;
  metadata?: { get(key: string): unknown[] };
}

function readFieldErrors(err: GrpcLikeError): FieldError[] | undefined {
  const [raw] = err.metadata?.get("x-validation-errors") ?? [];
  if (typeof raw !== "string") return undefined;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as FieldError[]) : undefined;
  } catch {
    return undefined;
  }
}

/** A gRPC error from the Job Posting Service → an ApiError safe to show in the UI. */
export function grpcErrorToApiError(err: GrpcLikeError): ApiError {
  const details = err.details || "The job service returned an error";
  switch (err.code) {
    case GRPC_STATUS.INVALID_ARGUMENT:
      return new ApiError("VALIDATION_ERROR", details, 400, readFieldErrors(err));
    case GRPC_STATUS.NOT_FOUND:
      return new ApiError("NOT_FOUND", details, 404);
    case GRPC_STATUS.FAILED_PRECONDITION:
      return new ApiError("INVALID_STATE", details, 409);
    case GRPC_STATUS.PERMISSION_DENIED:
      return new ApiError("FORBIDDEN", details, 403);
    case GRPC_STATUS.UNAUTHENTICATED:
      return new ApiError("UNAUTHENTICATED", details, 401);
    case GRPC_STATUS.UNAVAILABLE:
    case GRPC_STATUS.DEADLINE_EXCEEDED:
      return new ApiError("SERVICE_UNAVAILABLE", "Job service is unavailable. Please try again.", 503);
    default:
      return new ApiError("INTERNAL", "Something went wrong with the job service. Please try again.", 500);
  }
}
