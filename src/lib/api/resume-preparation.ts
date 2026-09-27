import type { CandidateProfile, JobPosting, ResumeDraft, ResumeFormat, ResumeSection } from "@/lib/types";
import * as candidateProfile from "./candidate-profile";
import { ApiError } from "./errors";
import * as jobPosting from "./job-posting";
import { SEEKER_ID, newId, nowIso, simulate, store } from "./_store";

// Mock of the Resume Preparation Service: drafts live in the browser session,
// but they are built from the real profile and the real job.

function period(start: string | null, end: string | null, current: boolean): string {
  const from = start ? start.slice(0, 7) : "";
  const to = current || !end ? "Present" : end.slice(0, 7);
  return from ? `${from} – ${to}` : to;
}

function buildSections(p: CandidateProfile, job: JobPosting): ResumeSection[] {
  const wanted = new Set(job.requirements.requiredSkills.map((s) => s.name.toLowerCase()));
  const relevant = (text: string) => [...wanted].some((s) => text.toLowerCase().includes(s));
  const bullets = (items: string[]) => items.map((text) => ({ id: newId("b"), text, tailored: relevant(text) }));
  const skillNames = p.skills.map((s) => s.name);

  return [
    {
      id: "summary", kind: "summary", title: "Summary",
      bullets: p.summary ? [{ id: newId("b"), text: p.summary, tailored: true }] : [],
      emphasized: true, included: Boolean(p.summary),
    },
    ...p.experience.map((e) => ({
      id: e.id, kind: "experience" as const, title: `${e.jobTitle} · ${e.companyName}`,
      meta: period(e.startDate, e.endDate, e.isCurrent),
      bullets: bullets(e.bullets), emphasized: e.bullets.some(relevant), included: true,
    })),
    ...p.projects.map((pr) => ({
      id: pr.id, kind: "project" as const, title: pr.name, meta: pr.tech.join(", "),
      bullets: bullets(pr.bullets), emphasized: pr.tech.some((t) => wanted.has(t.toLowerCase())), included: true,
    })),
    {
      id: "skills", kind: "skills", title: "Skills",
      // Only reorders the candidate's own skills: job-relevant first. Never adds new ones (ADR-004).
      bullets: skillNames.length
        ? [{ id: newId("b"), text: [...skillNames].sort((a, b) => Number(wanted.has(b.toLowerCase())) - Number(wanted.has(a.toLowerCase()))).join(", "), tailored: false }]
        : [],
      emphasized: false, included: skillNames.length > 0,
    },
    {
      id: "education", kind: "education", title: "Education",
      bullets: p.education.map((ed) => ({
        id: ed.id,
        text: [ed.fieldOfStudy ? `${ed.degree} in ${ed.fieldOfStudy}` : ed.degree, ed.institutionName, ed.year].filter(Boolean).join(", "),
        tailored: false,
      })),
      emphasized: false, included: p.education.length > 0,
    },
  ];
}

function find(jobId: string): ResumeDraft {
  const d = store.resumeDrafts.find((r) => r.jobId === jobId && r.candidateId === SEEKER_ID);
  if (!d) throw new ApiError("NOT_FOUND", "No resume draft for this job yet");
  return d;
}

export async function generateTailoredResume(jobId: string): Promise<ResumeDraft> {
  const [job, profile] = await Promise.all([jobPosting.getJob(jobId), candidateProfile.getProfile()]);
  if (!profile) throw new ApiError("PROFILE_REQUIRED", "Create your profile before tailoring a resume.");
  return simulate(() => {
    const draft: ResumeDraft = {
      id: newId("draft"), jobId, candidateId: SEEKER_ID,
      format: job.applicationSettings.resumeTemplateId ? "company" : "personal",
      sections: buildSections(profile, job), approved: false, updatedAt: nowIso(),
    };
    const existing = store.resumeDrafts.findIndex((r) => r.jobId === jobId && r.candidateId === SEEKER_ID);
    if (existing >= 0) store.resumeDrafts.splice(existing, 1, draft);
    else store.resumeDrafts.push(draft);
    return draft;
  }, 1200);
}

export function getResumeDraft(jobId: string): Promise<ResumeDraft | null> {
  return simulate(() => store.resumeDrafts.find((r) => r.jobId === jobId && r.candidateId === SEEKER_ID) ?? null);
}

export function editResumeDraft(jobId: string, sections: ResumeSection[]): Promise<ResumeDraft> {
  return simulate(() => {
    const d = find(jobId);
    d.sections = sections;
    d.approved = false;
    d.updatedAt = nowIso();
    return d;
  }, 150);
}

export function selectResumeFormat(jobId: string, format: ResumeFormat): Promise<ResumeDraft> {
  return simulate(() => {
    const d = find(jobId);
    d.format = format;
    d.updatedAt = nowIso();
    return d;
  }, 150);
}

export function approveResume(jobId: string): Promise<ResumeDraft> {
  return simulate(() => {
    const d = find(jobId);
    d.approved = true;
    d.updatedAt = nowIso();
    return d;
  });
}

export function getApprovedResume(jobId: string): Promise<ResumeDraft> {
  return simulate(() => {
    const d = store.resumeDrafts.find((r) => r.jobId === jobId && r.candidateId === SEEKER_ID && r.approved);
    if (!d) throw new ApiError("RESUME_NOT_APPROVED", "Approve your resume before applying");
    return d;
  });
}
