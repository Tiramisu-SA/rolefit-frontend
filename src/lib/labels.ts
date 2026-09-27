import type {
  EducationLevel,
  EmploymentType,
  ExperienceLevel,
  JobLocation,
  JobSalary,
  JobStatus,
  SkillLevel,
  WorkArrangement,
} from "./types";

/** Display text for the service enum values. */
export const EMPLOYMENT_TYPE_LABEL: Record<EmploymentType, string> = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  INTERNSHIP: "Internship",
  CONTRACT: "Contract",
};

export const WORK_ARRANGEMENT_LABEL: Record<WorkArrangement, string> = {
  ONSITE: "On-site",
  HYBRID: "Hybrid",
  REMOTE: "Remote",
};

export const SKILL_LEVEL_LABEL: Record<SkillLevel, string> = {
  BASIC: "Basic",
  INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced",
};

export const EDUCATION_LEVEL_LABEL: Record<EducationLevel, string> = {
  NONE: "No requirement",
  HIGH_SCHOOL: "High school",
  DIPLOMA: "Diploma",
  BACHELOR: "Bachelor's degree",
  MASTER: "Master's degree",
  DOCTORATE: "Doctorate",
};

export const JOB_STATUS_LABEL: Record<JobStatus, string> = {
  DRAFT: "Draft",
  OPEN: "Open",
  CLOSED: "Closed",
};

/** "Pathum Wan, Bangkok, Thailand"; parts that are not set are skipped. */
export function formatLocation(location: JobLocation): string {
  return [location.district, location.province, location.country].filter(Boolean).join(", ");
}

/** 0 → Internship, 1–2 → Entry level, 3–4 → Mid level, 5+ → Senior. */
export function experienceLevelFor(minimumYears: number): ExperienceLevel {
  if (minimumYears >= 5) return "Senior";
  if (minimumYears >= 3) return "Mid level";
  if (minimumYears >= 1) return "Entry level";
  return "Internship";
}

/** null when the recruiter hid the salary; otherwise a monthly range. */
export function formatSalary(salary: JobSalary): string | null {
  if (!salary.visible) return null;
  const { minimum, maximum } = salary;
  const n = (value: number) => value.toLocaleString("en-US");
  const money = (value: number) => (salary.currency === "THB" ? `฿${n(value)}` : `${salary.currency} ${n(value)}`);
  if (minimum !== undefined && maximum !== undefined) return `${money(minimum)} – ${n(maximum)} / mo`;
  if (minimum !== undefined) return `${money(minimum)}+ / mo`;
  if (maximum !== undefined) return `Up to ${money(maximum)} / mo`;
  return "Salary not listed";
}
