import type { Job, JobInput, JobStatus, JobWithCompany } from "@/lib/types";
import { CURRENT_COMPANY_ID, MockApiError, newId, nowIso, simulate, store, withCompany } from "./_store";

function find(id: string): Job {
  const job = store.jobs.find((j) => j.id === id);
  if (!job) throw new MockApiError("Job not found");
  return job;
}

function setStatus(id: string, status: JobStatus) {
  return simulate(() => {
    const job = find(id);
    job.status = status;
    return withCompany(job);
  });
}

export function getJob(id: string): Promise<JobWithCompany> {
  return simulate(() => withCompany(find(id)));
}

/** listJobs({ companyId }) for recruiters; listJobs({ status: "Published" }) for discovery. */
export function listJobs(opts: { companyId?: string; status?: JobStatus } = {}): Promise<JobWithCompany[]> {
  return simulate(() =>
    store.jobs
      .filter((j) => (opts.companyId ? j.companyId === opts.companyId : true))
      .filter((j) => (opts.status ? j.status === opts.status : true))
      .sort((a, b) => b.postedAt.localeCompare(a.postedAt))
      .map(withCompany),
  );
}

export function createJob(input: JobInput): Promise<JobWithCompany> {
  return simulate(() => {
    const job: Job = { ...input, id: newId("job"), companyId: CURRENT_COMPANY_ID, postedAt: nowIso(), status: "Draft" };
    store.jobs.push(job);
    return withCompany(job);
  });
}

export function updateJob(id: string, input: Partial<JobInput>): Promise<JobWithCompany> {
  return simulate(() => {
    const job = find(id);
    Object.assign(job, input);
    return withCompany(job);
  });
}

export const publishJob = (id: string) => setStatus(id, "Published");
export const closeJob = (id: string) => setStatus(id, "Closed");
export const reopenJob = (id: string) => setStatus(id, "Published");

export function attachResumeTemplate(id: string, file: File): Promise<JobWithCompany> {
  return simulate(() => {
    const job = find(id);
    job.resumeTemplateName = file.name;
    return withCompany(job);
  });
}

export function getResumeTemplate(id: string): Promise<{ name: string } | null> {
  return simulate(() => {
    const job = find(id);
    return job.resumeTemplateName ? { name: job.resumeTemplateName } : null;
  });
}
