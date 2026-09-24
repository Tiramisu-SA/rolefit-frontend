import type { CandidateProfile, ExperienceLevel, Job, JobSearchFilters, JobWithMatch, MatchResult } from "@/lib/types";
import { CURRENT_CANDIDATE_ID, MockApiError, nowIso, simulate, store, withCompany } from "./_store";

const LEVEL_YEARS: Record<ExperienceLevel, number> = { Internship: 0, "Entry level": 1, "Mid level": 3, Senior: 5 };

function yearsOfExperience(p: CandidateProfile): number {
  const months = p.experience.reduce((sum, e) => {
    const end = e.end ? new Date(e.end) : new Date();
    return sum + Math.max(0, (end.getTime() - new Date(e.start).getTime()) / (30 * 86_400_000));
  }, 0);
  return Math.round((months / 12) * 10) / 10;
}

const norm = (s: string) => s.toLowerCase();

export function computeMatch(p: CandidateProfile, job: Job): MatchResult {
  const have = new Set(p.skills.map(norm));
  const matchedSkills = job.requiredSkills.filter((s) => have.has(norm(s)));
  const missingSkills = job.requiredSkills.filter((s) => !have.has(norm(s)));
  const skills = job.requiredSkills.length ? Math.round((matchedSkills.length / job.requiredSkills.length) * 100) : 100;

  const years = yearsOfExperience(p);
  const needed = LEVEL_YEARS[job.experienceLevel];
  const experience = needed === 0 ? 100 : Math.min(100, Math.round((years / needed) * 100));
  const education = p.education.length ? 100 : 50;

  let preferences = 0;
  if (p.preferences.arrangements.includes(job.arrangement)) preferences += 40;
  if (job.arrangement === "Remote" || p.preferences.locations.includes(job.location)) preferences += 30;
  if (p.preferences.employmentTypes.includes(job.employmentType)) preferences += 30;

  const score = Math.round(skills * 0.5 + experience * 0.25 + education * 0.1 + preferences * 0.15);

  const strengths = [
    matchedSkills.length ? `${matchedSkills.slice(0, 3).join(", ")} in your verified profile` : "",
    experience >= 100 ? `${years} years of experience meets the ${job.experienceLevel.toLowerCase()} requirement` : "",
    preferences >= 70 ? "Location and work arrangement match your preferences" : "",
  ].filter(Boolean);
  const gaps = [
    ...missingSkills.map((s) => `${s} is required but not in your profile`),
    experience < 100 ? `The role asks for about ${needed}+ years; your profile shows ${years}` : "",
  ].filter(Boolean);

  const explanation =
    `You meet ${matchedSkills.length} of ${job.requiredSkills.length} required skills` +
    (matchedSkills.length ? `, including ${matchedSkills.slice(0, 2).join(" and ")}` : "") +
    `. ` +
    (experience >= 100 ? "Your experience meets the level this role asks for. " : "Your experience is below the level this role asks for. ") +
    (missingSkills.length ? `The main gap is ${missingSkills[0]}.` : "There are no missing required skills.");

  return {
    jobId: job.id,
    candidateId: p.id,
    score,
    breakdown: { skills, experience, education, preferences },
    matchedSkills,
    missingSkills,
    strengths,
    gaps,
    explanation,
    computedAt: nowIso(),
  };
}

function profile(): CandidateProfile {
  const p = store.candidates.find((c) => c.id === CURRENT_CANDIDATE_ID);
  if (!p) throw new MockApiError("Profile not found");
  return p;
}

function published(): Job[] {
  return store.jobs.filter((j) => j.status === "Published");
}

function toMatch(job: Job): JobWithMatch {
  return { ...withCompany(job), match: computeMatch(profile(), job) };
}

export function searchJobs(filters: JobSearchFilters = {}): Promise<JobWithMatch[]> {
  return simulate(() => {
    const q = filters.query?.trim().toLowerCase();
    const loc = filters.location?.trim().toLowerCase();
    return published()
      .filter((j) => {
        const company = withCompany(j).company.name.toLowerCase();
        if (q && !`${j.title} ${company} ${j.requiredSkills.join(" ")}`.toLowerCase().includes(q)) return false;
        if (loc && !(j.location.toLowerCase().includes(loc) || (loc === "remote" && j.arrangement === "Remote"))) return false;
        if (filters.employmentTypes?.length && !filters.employmentTypes.includes(j.employmentType)) return false;
        if (filters.arrangements?.length && !filters.arrangements.includes(j.arrangement)) return false;
        if (filters.experienceLevels?.length && !filters.experienceLevels.includes(j.experienceLevel)) return false;
        if (filters.minSalary && (j.salaryMax ?? j.salaryMin ?? 0) < filters.minSalary) return false;
        return true;
      })
      .map(toMatch)
      .sort((a, b) => b.match.score - a.match.score);
  });
}

export function getRecommendations(limit = 6): Promise<JobWithMatch[]> {
  return simulate(() => published().map(toMatch).sort((a, b) => b.match.score - a.match.score).slice(0, limit));
}

export function evaluateJobFit(jobId: string): Promise<JobWithMatch> {
  return simulate(() => {
    const job = store.jobs.find((j) => j.id === jobId);
    if (!job) throw new MockApiError("Job not found");
    return toMatch(job);
  }, 800);
}

export function getMatchResult(jobId: string, candidateId: string = CURRENT_CANDIDATE_ID): Promise<MatchResult> {
  return simulate(() => {
    const job = store.jobs.find((j) => j.id === jobId);
    const p = store.candidates.find((c) => c.id === candidateId);
    if (!job || !p) throw new MockApiError("Match not available");
    return computeMatch(p, job);
  });
}
