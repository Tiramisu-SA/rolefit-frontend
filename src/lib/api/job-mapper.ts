import type { JobPosting, JobPostingInput, JobStatus, ResumeTemplateInfo } from "@/lib/types";

// Pure mapping between the Job Posting proto messages (snake_case, prefixed
// enums, "" / UNSPECIFIED for "not set") as returned by the API Gateway, and
// the frontend types.

/* eslint-disable @typescript-eslint/no-explicit-any */
type Msg = Record<string, any>;

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
