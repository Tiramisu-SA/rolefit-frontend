import type { ResumeDraft, ResumeFormat, ResumeSection } from "@/lib/types";
import { CURRENT_CANDIDATE_ID, MockApiError, newId, nowIso, simulate, store } from "./_store";

function buildSections(jobId: string): ResumeSection[] {
  const p = store.candidates.find((c) => c.id === CURRENT_CANDIDATE_ID);
  const job = store.jobs.find((j) => j.id === jobId);
  if (!p || !job) throw new MockApiError("Cannot generate a resume for this job");
  const wanted = new Set(job.requiredSkills.map((s) => s.toLowerCase()));
  const relevant = (text: string) => [...wanted].some((s) => text.toLowerCase().includes(s));
  const bullets = (items: string[]) => items.map((text) => ({ id: newId("b"), text, tailored: relevant(text) }));

  const sections: ResumeSection[] = [
    { id: "summary", kind: "summary", title: "Summary", bullets: [{ id: newId("b"), text: p.summary, tailored: true }], emphasized: true, included: true },
    ...p.experience.map((e) => ({
      id: e.id, kind: "experience" as const, title: `${e.role} · ${e.organization}`,
      meta: `${e.start.slice(0, 7)} – ${e.end ? e.end.slice(0, 7) : "Present"}`,
      bullets: bullets(e.bullets), emphasized: e.bullets.some(relevant), included: true,
    })),
    ...p.projects.map((pr) => ({
      id: pr.id, kind: "project" as const, title: pr.name, meta: pr.tech.join(", "),
      bullets: bullets(pr.bullets), emphasized: pr.tech.some((t) => wanted.has(t.toLowerCase())), included: true,
    })),
    {
      id: "skills", kind: "skills", title: "Skills",
      // Only reorders the candidate's own skills: job-relevant first. Never adds new ones (ADR-004).
      bullets: [{ id: newId("b"), text: [...p.skills].sort((a, b) => Number(wanted.has(b.toLowerCase())) - Number(wanted.has(a.toLowerCase()))).join(", "), tailored: false }],
      emphasized: false, included: true,
    },
    {
      id: "education", kind: "education", title: "Education",
      bullets: p.education.map((ed) => ({ id: ed.id, text: `${ed.degree}, ${ed.school}, ${ed.year}`, tailored: false })),
      emphasized: false, included: true,
    },
  ];
  return sections;
}

function find(jobId: string): ResumeDraft {
  const d = store.resumeDrafts.find((r) => r.jobId === jobId && r.candidateId === CURRENT_CANDIDATE_ID);
  if (!d) throw new MockApiError("No resume draft for this job yet");
  return d;
}

export function generateTailoredResume(jobId: string): Promise<ResumeDraft> {
  return simulate(() => {
    const job = store.jobs.find((j) => j.id === jobId);
    const existing = store.resumeDrafts.findIndex((r) => r.jobId === jobId && r.candidateId === CURRENT_CANDIDATE_ID);
    const draft: ResumeDraft = {
      id: newId("draft"), jobId, candidateId: CURRENT_CANDIDATE_ID,
      format: job?.resumeTemplateName ? "company" : "personal",
      sections: buildSections(jobId), approved: false, updatedAt: nowIso(),
    };
    if (existing >= 0) store.resumeDrafts.splice(existing, 1, draft);
    else store.resumeDrafts.push(draft);
    return draft;
  }, 1500);
}

export function getResumeDraft(jobId: string): Promise<ResumeDraft | null> {
  return simulate(() => store.resumeDrafts.find((r) => r.jobId === jobId && r.candidateId === CURRENT_CANDIDATE_ID) ?? null);
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

export function getApprovedResume(jobId: string, candidateId: string = CURRENT_CANDIDATE_ID): Promise<ResumeDraft> {
  return simulate(() => {
    const d = store.resumeDrafts.find((r) => r.jobId === jobId && r.candidateId === candidateId && r.approved);
    if (!d) throw new MockApiError("Approve your resume before applying");
    return d;
  });
}
