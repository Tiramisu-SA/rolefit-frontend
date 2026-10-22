import type {
  CandidatePreferences,
  CandidateProfile,
  Education,
  EducationInput,
  Experience,
  ExperienceInput,
  ExtractedProfile,
  ProfileBasics,
  ProfileDocument,
  Project,
  ProjectInput,
  Skill,
  SkillInput,
} from "@/lib/types";
import { ApiError } from "./errors";
import { gatewayRequest } from "./gateway";

// REST client for the Candidate Profile Service, reached through the API
// Gateway (/api/candidates/* → the service's /api/*). Every route works on the
// signed-in user's own profile (/profiles/me); the gateway tells the service who that is.

const DOC = "application/msword";
const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const request = <T>(method: string, path: string, init: { json?: unknown; body?: BodyInit; headers?: HeadersInit } = {}) =>
  gatewayRequest<T>(method, `/api/candidates/profiles${path}`, { ...init, serviceName: "profile service" });

// --- profile ---

/** The seeker's profile, or null when they have not created one yet. */
export async function getProfile(): Promise<CandidateProfile | null> {
  try {
    return await request<CandidateProfile>("GET", "/me");
  } catch (e) {
    if (e instanceof ApiError && e.code === "PROFILE_NOT_FOUND") return null;
    throw e;
  }
}

export const createProfile = (basics: Partial<ProfileBasics> & { name: string }) =>
  request<CandidateProfile>("POST", "/me", { json: basics });

/** Sends only the given basics (name, headline, summary, email, location, links). */
export const updateBasics = (patch: Partial<ProfileBasics>) => request<CandidateProfile>("PATCH", "/me", { json: patch });

export const deleteProfile = () => request<void>("DELETE", "/me");

// --- child collections ---

export const addSkill = (input: SkillInput) => request<Skill>("POST", "/me/skills", { json: input });
export const updateSkill = (id: string, input: SkillInput) => request<Skill>("PUT", `/me/skills/${encodeURIComponent(id)}`, { json: input });
export const deleteSkill = (id: string) => request<void>("DELETE", `/me/skills/${encodeURIComponent(id)}`);

export const addExperience = (input: ExperienceInput) => request<Experience>("POST", "/me/experience", { json: input });
export const updateExperience = (id: string, input: ExperienceInput) =>
  request<Experience>("PUT", `/me/experience/${encodeURIComponent(id)}`, { json: input });
export const deleteExperience = (id: string) => request<void>("DELETE", `/me/experience/${encodeURIComponent(id)}`);

export const addEducation = (input: EducationInput) => request<Education>("POST", "/me/education", { json: input });
export const updateEducation = (id: string, input: EducationInput) =>
  request<Education>("PUT", `/me/education/${encodeURIComponent(id)}`, { json: input });
export const deleteEducation = (id: string) => request<void>("DELETE", `/me/education/${encodeURIComponent(id)}`);

export const addProject = (input: ProjectInput) => request<Project>("POST", "/me/projects", { json: input });
export const updateProject = (id: string, input: ProjectInput) =>
  request<Project>("PUT", `/me/projects/${encodeURIComponent(id)}`, { json: input });
export const deleteProject = (id: string) => request<void>("DELETE", `/me/projects/${encodeURIComponent(id)}`);

// --- preferences ---

export const savePreferences = (prefs: CandidatePreferences) =>
  request<CandidatePreferences>("PUT", "/me/preferences", { json: prefs });
export const deletePreferences = () => request<void>("DELETE", "/me/preferences");

// --- resume import / confirm ---

function resumeContentType(file: File): string {
  if (file.type) return file.type;
  const name = file.name.toLowerCase();
  if (name.endsWith(".docx")) return DOCX;
  if (name.endsWith(".doc")) return DOC;
  return "application/pdf";
}

/** Uploads the file; returns what was extracted. Nothing is saved until confirmProfile. */
export const importResume = (file: File) =>
  request<ExtractedProfile>("POST", "/me/import-resume", {
    body: file,
    headers: { "Content-Type": resumeContentType(file), "X-File-Name": encodeURIComponent(file.name) },
  });

/** Saves a whole reviewed profile (replacing every section) and marks it verified. */
export const confirmProfile = (doc: ProfileDocument) => request<CandidateProfile>("POST", "/me/confirm", { json: doc });
