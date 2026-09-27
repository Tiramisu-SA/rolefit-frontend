import type { FieldError } from "@/lib/api/errors";
import type { JobPosting, JobPostingInput } from "@/lib/types";

// Client-side copy of the Job Posting Service rules (src/validation/job.validation.ts
// in that repo), so recruiters see problems before sending. The service still
// validates; its field errors use the same paths.

export function emptyJobInput(): JobPostingInput {
  return {
    title: "",
    description: "",
    requirements: { requiredSkills: [], preferredSkills: [], minimumExperienceYears: 0, educationLevel: "NONE", acceptedFields: [] },
    responsibilities: [],
    employmentType: undefined,
    workArrangement: undefined,
    location: {},
    salary: { currency: "THB", visible: true },
    applicationDeadline: undefined,
    positionsAvailable: 1,
    requireCoverLetter: false,
  };
}

export function jobToInput(job: JobPosting): JobPostingInput {
  return {
    title: job.title,
    description: job.description,
    requirements: job.requirements,
    responsibilities: job.responsibilities,
    employmentType: job.employmentType,
    workArrangement: job.workArrangement,
    location: job.location,
    salary: job.salary,
    applicationDeadline: job.applicationSettings.applicationDeadline,
    positionsAvailable: job.applicationSettings.positionsAvailable,
    requireCoverLetter: job.applicationSettings.requireCoverLetter,
  };
}

const isWhole = (n: number, min: number, max: number) => Number.isInteger(n) && n >= min && n <= max;

export function validateJobForm(input: JobPostingInput, opts: { forPublish: boolean; now: Date }): FieldError[] {
  const errors: FieldError[] = [];
  const fail = (field: string, message: string) => errors.push({ field, message });
  const r = input.requirements;

  const title = input.title.trim();
  if (!title) fail("title", "Add a job title");
  else if (title.length > 200) fail("title", "Keep the title under 200 characters");
  if (input.description.length > 10_000) fail("description", "Keep the description under 10,000 characters");
  else if (opts.forPublish && !input.description.trim()) fail("description", "Add a description before publishing");
  if (input.responsibilities.length > 30) fail("responsibilities", "At most 30 responsibilities");

  const seen = new Set<string>();
  const checkName = (name: string, field: string) => {
    const key = name.trim().toLowerCase();
    if (!key) fail(field, "Add a skill name");
    else if (seen.has(key)) fail(field, `"${name.trim()}" is listed more than once`);
    seen.add(key);
  };
  if (r.requiredSkills.length > 30) fail("requirements.requiredSkills", "At most 30 required skills");
  r.requiredSkills.forEach((s, i) => {
    checkName(s.name, `requirements.requiredSkills[${i}].name`);
    if (!isWhole(s.minimumYears, 0, 50)) fail(`requirements.requiredSkills[${i}].minimumYears`, "Use 0–50 years");
  });
  if (opts.forPublish && r.requiredSkills.length === 0) fail("requirements.requiredSkills", "Add at least one required skill");
  if (r.preferredSkills.length > 30) fail("requirements.preferredSkills", "At most 30 preferred skills");
  r.preferredSkills.forEach((s, i) => checkName(s.name, `requirements.preferredSkills[${i}].name`));
  if (!isWhole(r.minimumExperienceYears, 0, 50)) fail("requirements.minimumExperienceYears", "Use 0–50 years");
  if (r.acceptedFields.length > 20) fail("requirements.acceptedFields", "At most 20 fields");

  if (opts.forPublish && !input.employmentType) fail("employmentType", "Choose an employment type");
  if (opts.forPublish && !input.workArrangement) fail("workArrangement", "Choose a work arrangement");
  if (opts.forPublish && !input.location.country?.trim()) fail("location.country", "Add the country");
  if (opts.forPublish && !input.location.province?.trim()) fail("location.province", "Add the province");

  const { minimum, maximum, currency } = input.salary;
  if (minimum !== undefined && minimum < 0) fail("salary.minimum", "Can't be negative");
  if (maximum !== undefined && maximum < 0) fail("salary.maximum", "Can't be negative");
  else if (minimum !== undefined && maximum !== undefined && minimum > maximum) fail("salary.maximum", "Must be at least the minimum");
  if (!/^[A-Z]{3}$/.test(currency)) fail("salary.currency", "Use a 3-letter code, e.g. THB");

  if (!isWhole(input.positionsAvailable, 1, 1000)) fail("positionsAvailable", "Use 1–1000 positions");
  if (input.applicationDeadline) {
    const deadline = new Date(input.applicationDeadline);
    if (Number.isNaN(deadline.getTime())) fail("applicationDeadline", "Enter a valid date and time");
    else if (opts.forPublish && deadline <= opts.now) fail("applicationDeadline", "The deadline has already passed");
  }
  return errors;
}

/** Field errors keyed by path; the service reports some fields under applicationSettings. */
export function errorMap(errors: FieldError[] | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const { field, message } of errors ?? []) {
    const key = field.replace(/^applicationSettings\./, "");
    if (!(key in out)) out[key] = message;
  }
  return out;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** ISO → "YYYY-MM-DDTHH:mm" in the browser's time zone, for <input type="datetime-local">. */
export function toDateTimeInput(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "YYYY-MM-DDTHH:mm" (local) → ISO; "" → undefined. */
export function fromDateTimeInput(value: string): string | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}
