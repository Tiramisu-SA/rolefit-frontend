export type Role = "seeker" | "recruiter";

export type EmploymentType = "Full-time" | "Part-time" | "Internship" | "Contract";
export type WorkArrangement = "On-site" | "Hybrid" | "Remote";
export type ExperienceLevel = "Internship" | "Entry level" | "Mid level" | "Senior";
export type JobStatus = "Draft" | "Published" | "Closed";
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

export interface Job {
  id: string;
  companyId: string;
  title: string;
  team: string;
  location: string;
  arrangement: WorkArrangement;
  employmentType: EmploymentType;
  experienceLevel: ExperienceLevel;
  salaryMin?: number;
  salaryMax?: number;
  description: string;
  responsibilities: string[];
  requiredSkills: string[];
  requirements: string[];
  preferred: string[];
  deadline?: string;
  postedAt: string;
  status: JobStatus;
  resumeTemplateName?: string;
}

export interface JobWithCompany extends Job {
  company: Company;
}

export type JobInput = Omit<Job, "id" | "companyId" | "postedAt" | "status">;

export interface Experience {
  id: string;
  role: string;
  organization: string;
  start: string;
  end?: string;
  bullets: string[];
}

export interface Project {
  id: string;
  name: string;
  tech: string[];
  bullets: string[];
}

export interface Education {
  id: string;
  degree: string;
  school: string;
  year: string;
}

export interface CandidatePreferences {
  locations: string[];
  arrangements: WorkArrangement[];
  employmentTypes: EmploymentType[];
  minSalary?: number;
}

export interface CandidateProfile {
  id: string;
  name: string;
  initials: string;
  headline: string;
  email: string;
  location: string;
  links: string[];
  summary: string;
  skills: string[];
  experience: Experience[];
  projects: Project[];
  education: Education[];
  preferences: CandidatePreferences;
  verified: boolean;
  completeness: number;
}

export interface ExtractedProfile {
  fileName: string;
  profile: Omit<CandidateProfile, "id" | "verified" | "completeness">;
}

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

export interface Application {
  id: string;
  jobId: string;
  candidateId: string;
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
  candidate: Pick<CandidateProfile, "id" | "name" | "initials" | "headline" | "email">;
}

export interface JobSearchFilters {
  query?: string;
  location?: string;
  employmentTypes?: EmploymentType[];
  arrangements?: WorkArrangement[];
  experienceLevels?: ExperienceLevel[];
  minSalary?: number;
}
