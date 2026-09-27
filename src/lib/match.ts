import { experienceLevelFor } from "./labels";
import type { CandidateProfile, JobPosting, MatchResult, MatchTier } from "./types";

export function matchTier(score: number): MatchTier {
  if (score >= 80) return "strong";
  if (score >= 60) return "good";
  return "partial";
}

export const MATCH_TIER_LABEL: Record<MatchTier, string> = {
  strong: "Strong match",
  good: "Good match",
  partial: "Partial match",
};

/** Tailwind classes per tier; text + soft background + ring stroke. */
export const MATCH_TIER_CLASS: Record<MatchTier, { text: string; soft: string; ring: string; track: string }> = {
  strong: { text: "text-match-strong", soft: "bg-match-strong-soft", ring: "stroke-match-strong-ring", track: "stroke-match-strong-soft" },
  good: { text: "text-match-good", soft: "bg-match-good-soft", ring: "stroke-match-good-ring", track: "stroke-match-good-soft" },
  partial: { text: "text-match-partial", soft: "bg-match-partial-soft", ring: "stroke-match-partial-ring", track: "stroke-match-partial-soft" },
};

const norm = (s: string) => s.trim().toLowerCase();

/**
 * Deterministic job fit, computed in the browser until the Job Discovery
 * Service exists. Weights: skills 50%, experience 25%, education 10%,
 * preferences 15%. A missing profile counts as an empty one.
 */
export function computeMatch(profile: CandidateProfile | null, job: JobPosting): MatchResult {
  const have = new Set((profile?.skills ?? []).map((s) => norm(s.name)));
  const required = job.requirements.requiredSkills.map((s) => s.name);
  const matchedSkills = required.filter((s) => have.has(norm(s)));
  const missingSkills = required.filter((s) => !have.has(norm(s)));
  const skills = required.length ? Math.round((matchedSkills.length / required.length) * 100) : 100;

  const years = Math.round(((profile?.totalExperienceMonths ?? 0) / 12) * 10) / 10;
  const needed = job.requirements.minimumExperienceYears;
  const experience = needed === 0 ? 100 : Math.min(100, Math.round((years / needed) * 100));
  const education = profile?.education.length ? 100 : 50;

  const prefs = profile?.preferences;
  let preferences = 0;
  if (prefs) {
    const province = job.location.province ? norm(job.location.province) : "";
    const locationOk =
      job.workArrangement === "REMOTE" ||
      (province !== "" && prefs.preferredLocations.some((l) => norm(l) === province || province.includes(norm(l)) || norm(l).includes(province)));
    if (job.workArrangement && prefs.workArrangements.includes(job.workArrangement)) preferences += 40;
    if (locationOk) preferences += 30;
    if (job.employmentType && prefs.employmentTypes.includes(job.employmentType)) preferences += 30;
  }

  const score = Math.round(skills * 0.5 + experience * 0.25 + education * 0.1 + preferences * 0.15);
  const level = experienceLevelFor(needed).toLowerCase();

  const strengths = [
    matchedSkills.length ? `${matchedSkills.slice(0, 3).join(", ")} in your profile` : "",
    experience >= 100 ? `${years} years of experience meets the ${level} requirement` : "",
    preferences >= 70 ? "Location and work arrangement match your preferences" : "",
  ].filter(Boolean);
  const gaps = [
    ...missingSkills.map((s) => `${s} is required but not in your profile`),
    experience < 100 ? `The role asks for about ${needed}+ years; your profile shows ${years}` : "",
  ].filter(Boolean);

  const explanation =
    `You meet ${matchedSkills.length} of ${required.length} required skills` +
    (matchedSkills.length ? `, including ${matchedSkills.slice(0, 2).join(" and ")}` : "") +
    ". " +
    (experience >= 100 ? "Your experience meets the level this role asks for. " : "Your experience is below the level this role asks for. ") +
    (missingSkills.length ? `The main gap is ${missingSkills[0]}.` : "There are no missing required skills.");

  return {
    jobId: job.id,
    candidateId: profile?.id ?? "me",
    score,
    breakdown: { skills, experience, education, preferences },
    matchedSkills,
    missingSkills,
    strengths,
    gaps,
    explanation,
    computedAt: new Date().toISOString(),
  };
}
