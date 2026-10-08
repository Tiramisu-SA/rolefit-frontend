export type Role = "seeker" | "recruiter";

// Shared vocabulary: the exact values the Candidate Profile and Job Posting
// services store and send. Display text lives in lib/labels.ts.
export const EMPLOYMENT_TYPES = ["FULL_TIME", "PART_TIME", "INTERNSHIP", "CONTRACT"] as const;
export const WORK_ARRANGEMENTS = ["ONSITE", "HYBRID", "REMOTE"] as const;
export const SKILL_LEVELS = ["BASIC", "INTERMEDIATE", "ADVANCED"] as const;
export const EDUCATION_LEVELS = ["NONE", "HIGH_SCHOOL", "DIPLOMA", "BACHELOR", "MASTER", "DOCTORATE"] as const;
export const JOB_STATUSES = ["DRAFT", "OPEN", "CLOSED"] as const;

export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];
export type WorkArrangement = (typeof WORK_ARRANGEMENTS)[number];
export type SkillLevel = (typeof SKILL_LEVELS)[number];
export type EducationLevel = (typeof EDUCATION_LEVELS)[number];
export type JobStatus = (typeof JOB_STATUSES)[number];

/** Display-only level worked out from a job's minimum years of experience. */
export type ExperienceLevel = "Internship" | "Entry level" | "Mid level" | "Senior";
export type ApplicationStatus = "Submitted" | "Under review" | "Interview" | "Offer" | "Rejected";
export type ResumeFormat = "company" | "personal";
export type MatchTier = "strong" | "good" | "partial";

export interface Company {
  id: string;
  name: string;
  initials: string;
  /** Avatar background, a hex color used only for the company logo tile. */
  color: string;
}

// --- Job Posting Service (gRPC) ----------------------------------------------

export interface RequiredSkill {
  name: string;
  level: SkillLevel;
  minimumYears: number;
}

export interface PreferredSkill {
  name: string;
  level: SkillLevel;
}

export interface JobRequirements {
  requiredSkills: RequiredSkill[];
  preferredSkills: PreferredSkill[];
  minimumExperienceYears: number;
  educationLevel: EducationLevel;
  acceptedFields: string[];
}

export interface JobLocation {
  country?: string;
  province?: string;
  district?: string;
}

export interface JobSalary {
  minimum?: number;
  maximum?: number;
  currency: string;
  visible: boolean;
}

export interface ApplicationSettings {
  /** ISO-8601 */
  applicationDeadline?: string;
  positionsAvailable: number;
  resumeTemplateId?: string;
  requireCoverLetter: boolean;
}

/** A job document as the Job Posting Service returns it. */
export interface JobPosting {
  id: string;
  recruiterId: string;
  companyId: string;
  title: string;
  description: string;
  requirements: JobRequirements;
  responsibilities: string[];
  employmentType?: EmploymentType;
  workArrangement?: WorkArrangement;
  location: JobLocation;
  salary: JobSalary;
  applicationSettings: ApplicationSettings;
  status: JobStatus;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/** The fields a recruiter edits (create and full-replace update). */
export interface JobPostingInput {
  title: string;
  description: string;
  requirements: JobRequirements;
  responsibilities: string[];
  employmentType?: EmploymentType;
  workArrangement?: WorkArrangement;
  location: JobLocation;
  salary: JobSalary;
  /** ISO-8601 */
  applicationDeadline?: string;
  positionsAvailable: number;
  requireCoverLetter: boolean;
}

export interface JobWithCompany extends JobPosting {
  company: Company;
}

export interface ResumeTemplateInfo {
  id: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  createdAt: string;
}

// --- Candidate Profile Service (REST) ------------------------------------------

export interface Skill {
  id: string;
  name: string;
  proficiencyLevel: SkillLevel | null;
}

export interface Experience {
  id: string;
  companyName: string;
  jobTitle: string;
  /** YYYY-MM-DD */
  startDate: string | null;
  /** YYYY-MM-DD */
  endDate: string | null;
  isCurrent: boolean;
  bullets: string[];
}

export interface Education {
  id: string;
  institutionName: string;
  degree: string;
  fieldOfStudy: string | null;
  gpa: number | null;
  /** YYYY */
  year: string | null;
}

export interface Project {
  id: string;
  name: string;
  tech: string[];
  bullets: string[];
}

export interface CandidatePreferences {
  employmentTypes: EmploymentType[];
  preferredRoles: string[];
  workArrangements: WorkArrangement[];
  preferredLocations: string[];
  minimumSalary: number | null;
  salaryCurrency: string | null;
}

export interface ProfileBasics {
  name: string;
  headline: string | null;
  summary: string | null;
  email: string | null;
  location: string | null;
  links: string[];
}

export interface CandidateProfile extends ProfileBasics {
  /** Also the owner's user id (the seeker's X-User-Id). */
  id: string;
  verified: boolean;
  totalExperienceMonths: number;
  skills: Skill[];
  experience: Experience[];
  education: Education[];
  projects: Project[];
  preferences: CandidatePreferences | null;
  createdAt: string;
  updatedAt: string;
}

export type SkillInput = Omit<Skill, "id">;
export type ExperienceInput = Omit<Experience, "id">;
export type EducationInput = Omit<Education, "id">;
export type ProjectInput = Omit<Project, "id">;

/** A whole profile in one request: the import result and the confirm body. */
export interface ProfileDocument extends ProfileBasics {
  skills: SkillInput[];
  experience: ExperienceInput[];
  education: EducationInput[];
  projects: ProjectInput[];
  preferences: CandidatePreferences | null;
}

export interface ExtractedProfile {
  fileName: string;
  profile: ProfileDocument;
}

// --- Job Discovery Service (REST) -----------------------------------------------

export interface MatchBreakdown {
  skills: number;
  experience: number;
  education: number;
  preferences: number;
}

export interface MatchResult {
  jobId: string;
  candidateId: string;
  score: number;
  breakdown: MatchBreakdown;
  matchedSkills: string[];
  missingSkills: string[];
  strengths: string[];
  gaps: string[];
  explanation: string;
  computedAt: string;
}

export interface JobWithMatch extends JobWithCompany {
  match: MatchResult;
}

export interface JobSearchFilters {
  query?: string;
  location?: string;
  employmentTypes?: EmploymentType[];
  arrangements?: WorkArrangement[];
  experienceLevels?: ExperienceLevel[];
  minSalary?: number;
}

// --- Resume Preparation (mock) ----------------------------------------------------

export interface ResumeBullet {
  id: string;
  text: string;
  tailored: boolean;
}

export interface ResumeSection {
  id: string;
  kind: "summary" | "experience" | "project" | "skills" | "education";
  title: string;
  meta?: string;
  bullets: ResumeBullet[];
  emphasized: boolean;
  included: boolean;
}

export interface ResumeDraft {
  id: string;
  jobId: string;
  candidateId: string;
  format: ResumeFormat;
  sections: ResumeSection[];
  approved: boolean;
  updatedAt: string;
}

// --- Application (mock) --------------------------------------------------------------

export interface StatusChange {
  status: ApplicationStatus;
  at: string;
  note?: string;
}

export interface MatchSnapshot {
  score: number;
  summary: string;
  capturedAt: string;
}

/** Applicant details copied into the application when it is submitted. */
export interface ApplicantSummary {
  id: string;
  name: string;
  initials: string;
  headline: string;
  email: string;
}

export interface Application {
  id: string;
  jobId: string;
  candidateId: string;
  candidate: ApplicantSummary;
  resumeDraftId: string;
  resumeFormat: ResumeFormat;
  status: ApplicationStatus;
  submittedAt: string;
  updatedAt: string;
  matchSnapshot: MatchSnapshot;
  history: StatusChange[];
}

export interface ApplicationView extends Application {
  job: JobWithCompany;
}
