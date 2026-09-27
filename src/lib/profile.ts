import type { CandidateProfile, ProfileDocument } from "./types";

/** "Pimchanok Srisuk" → "PS"; empty → "?". */
export function profileInitials(name: string): string {
  const letters = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("");
  return letters || "?";
}

/** 0–100: how much of the profile is filled in (drives the completeness bar). */
export function profileCompleteness(p: CandidateProfile): number {
  let score = 0;
  if (p.name.trim()) score += 5;
  if (p.headline) score += 10;
  if (p.summary) score += 10;
  if (p.email) score += 5;
  if (p.location) score += 5;
  if (p.skills.length >= 3) score += 20;
  else if (p.skills.length > 0) score += 10;
  if (p.experience.length > 0) score += 15;
  if (p.education.length > 0) score += 10;
  if (p.projects.length > 0) score += 10;
  if (p.preferences) score += 10;
  return score;
}

export function emptyProfileDocument(): ProfileDocument {
  return {
    name: "",
    headline: null,
    summary: null,
    email: null,
    location: null,
    links: [],
    skills: [],
    experience: [],
    education: [],
    projects: [],
    preferences: null,
  };
}

/** A saved profile as a confirm-able document (drops ids and server-owned fields). */
export function toProfileDocument(p: CandidateProfile): ProfileDocument {
  return {
    name: p.name,
    headline: p.headline,
    summary: p.summary,
    email: p.email,
    location: p.location,
    links: p.links,
    skills: p.skills.map(({ id: _id, ...rest }) => rest),
    experience: p.experience.map(({ id: _id, ...rest }) => rest),
    education: p.education.map(({ id: _id, ...rest }) => rest),
    projects: p.projects.map(({ id: _id, ...rest }) => rest),
    preferences: p.preferences,
  };
}
