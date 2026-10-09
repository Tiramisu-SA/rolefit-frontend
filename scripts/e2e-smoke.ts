// End-to-end smoke test: drives the frontend's API modules through the API Gateway.
//
//   API Gateway + Candidate Profile + Job Posting (seeded) + Job Discovery must be running.
//   npx tsx scripts/e2e-smoke.ts
//
// Env (read from the environment, then .env.local / .env):
//   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, NEXT_PUBLIC_API_GATEWAY_URL (default http://localhost:8080)
//   SMOKE_SEEKER_EMAIL / SMOKE_SEEKER_PASSWORD        an existing seeker account
//   SMOKE_RECRUITER_EMAIL / SMOKE_RECRUITER_PASSWORD  an existing recruiter account
//   SMOKE_COMPANY_ID (default co-brightline)          the gateway's DEV_RECRUITER_COMPANY_ID
// It deletes the seeker's profile. Its test job ends CLOSED (only drafts can be
// deleted), so run it against a dev database, not one you care about.

for (const file of [".env.local", ".env"]) {
  try {
    process.loadEnvFile(file);
  } catch {
    // file not present
  }
}
process.env.NEXT_PUBLIC_API_GATEWAY_URL ??= "http://localhost:8080";
const COMPANY = process.env.SMOKE_COMPANY_ID ?? "co-brightline";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} must be set`);
  return value;
}

let failures = 0;
async function step(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`PASS  ${name}`);
  } catch (e) {
    failures++;
    console.log(`FAIL  ${name}\n      ${e instanceof Error ? e.message : String(e)}`);
  }
}
function expect(cond: unknown, message: string) {
  if (!cond) throw new Error(message);
}

async function main() {
  const profile = await import("../src/lib/api/candidate-profile");
  const jobs = await import("../src/lib/api/job-posting");
  const discovery = await import("../src/lib/api/job-discovery");
  const { ApiError } = await import("../src/lib/api/errors");
  const { supabase } = await import("../src/lib/auth/supabase");

  const signInAs = async (who: "SEEKER" | "RECRUITER") => {
    await supabase.auth.signOut({ scope: "local" });
    const { error } = await supabase.auth.signInWithPassword({
      email: required(`SMOKE_${who}_EMAIL`),
      password: required(`SMOKE_${who}_PASSWORD`),
    });
    if (error) throw new Error(`sign-in as ${who.toLowerCase()} failed: ${error.message}`);
  };

  const rejects = async (p: Promise<unknown>, code: string) => {
    try {
      await p;
    } catch (e) {
      expect(e instanceof ApiError && e.code === code, `expected ${code}, got ${e instanceof ApiError ? e.code : String(e)}`);
      return e as InstanceType<typeof ApiError>;
    }
    throw new Error(`expected ${code}, but it succeeded`);
  };

  await signInAs("SEEKER");
  await step("profile: start clean", async () => {
    await profile.deleteProfile().catch((e) => {
      if (!(e instanceof ApiError && e.code === "PROFILE_NOT_FOUND")) throw e;
    });
  });

  // --- Candidate Profile Service (REST) ---
  await step("profile: none yet → null", async () => expect((await profile.getProfile()) === null, "expected null"));
  await step("profile: create, then duplicate create is 409", async () => {
    const p = await profile.createProfile({ name: "E2E Seeker", links: ["https://example.com"] });
    expect(p.name === "E2E Seeker" && !p.verified, "unexpected profile");
    await rejects(profile.createProfile({ name: "Again" }), "PROFILE_ALREADY_EXISTS");
  });
  await step("profile: validation errors carry field paths", async () => {
    const e = await rejects(profile.updateBasics({ email: "nope", links: ["ftp://x"] }), "VALIDATION_ERROR");
    expect(JSON.stringify(e.fieldErrors?.map((f) => f.field)) === '["email","links[0]"]', JSON.stringify(e.fieldErrors));
  });
  await step("skills: add, duplicate (case-insensitive) is 409, update, delete", async () => {
    const s = await profile.addSkill({ name: "Python", proficiencyLevel: "INTERMEDIATE" });
    await rejects(profile.addSkill({ name: "python", proficiencyLevel: null }), "DUPLICATE_SKILL");
    const u = await profile.updateSkill(s.id, { name: "Python", proficiencyLevel: "ADVANCED" });
    expect(u.proficiencyLevel === "ADVANCED", "level not updated");
    const go = await profile.addSkill({ name: "Go", proficiencyLevel: null });
    await profile.deleteSkill(go.id);
  });
  await step("experience/education/projects CRUD and months", async () => {
    const x = await profile.addExperience({
      companyName: "Webcraft", jobTitle: "Intern", startDate: "2025-01-01", endDate: "2025-12-31", isCurrent: false, bullets: ["Built things"],
    });
    let p = (await profile.getProfile())!;
    expect(p.totalExperienceMonths === 12, `months ${p.totalExperienceMonths}`);
    expect(p.experience[0].startDate === "2025-01-01", `date ${p.experience[0].startDate}`);
    await profile.updateExperience(x.id, { ...x, isCurrent: true, endDate: null });
    await rejects(profile.updateExperience(x.id, { ...x, isCurrent: true, endDate: "2025-06-30" }), "VALIDATION_ERROR");
    const ed = await profile.addEducation({ institutionName: "CU", degree: "B.Eng.", fieldOfStudy: "Computer Engineering", gpa: 3.4, year: "2026" });
    p = (await profile.getProfile())!;
    expect(p.education[0].gpa === 3.4, `gpa ${p.education[0].gpa}`);
    await profile.updateEducation(ed.id, { ...ed, year: "2027" });
    const pr = await profile.addProject({ name: "RoleFit", tech: ["Next.js"], bullets: [] });
    await profile.deleteProject(pr.id);
    await rejects(profile.deleteProject(pr.id), "PROJECT_NOT_FOUND");
  });
  await step("preferences: save, update, delete", async () => {
    await profile.savePreferences({
      employmentTypes: ["FULL_TIME"], preferredRoles: [], workArrangements: ["HYBRID"], preferredLocations: ["Bangkok"], minimumSalary: 30000, salaryCurrency: "THB",
    });
    const p = (await profile.getProfile())!;
    expect(p.preferences?.minimumSalary === 30000, "salary not saved");
    await profile.deletePreferences();
    await rejects(profile.deletePreferences(), "PREFERENCES_NOT_FOUND");
  });
  await step("import resume → confirm replaces the profile", async () => {
    const extracted = await profile.importResume(new File(["%PDF-1.7"], "ประวัติ.pdf", { type: "application/pdf" }));
    expect(extracted.fileName === "ประวัติ.pdf", `file name ${extracted.fileName}`);
    const p = await profile.confirmProfile(extracted.profile);
    expect(p.verified && p.name === "Pimchanok Srisuk" && p.skills.length === 8, "confirm did not replace");
    await rejects(profile.importResume(new File(["x"], "cv.png", { type: "image/png" })), "UNSUPPORTED_FILE_TYPE");
  });

  // --- Job Posting Service (gRPC behind the gateway) ---
  await signInAs("RECRUITER");
  let jobId = "";
  await step("jobs: recruiter list includes own drafts; public list is OPEN only", async () => {
    const mine = await jobs.listMyJobs();
    expect(mine.some((j) => j.status === "DRAFT"), "no draft in own list");
    expect(mine.every((j) => j.companyId === COMPANY), "other company in own list");
    const open = await jobs.listOpenJobs();
    expect(open.length > 0 && open.every((j) => j.status === "OPEN"), "public list not OPEN only");
    const q = await jobs.listOpenJobs({ query: "react" });
    expect(q.length > 0, "query returned nothing");
  });
  await step("jobs: create draft, publish needs full details, then publishes", async () => {
    const draft = await jobs.createJob({
      title: "E2E Backend Engineer", description: "", responsibilities: [],
      requirements: { requiredSkills: [], preferredSkills: [], minimumExperienceYears: 0, educationLevel: "NONE", acceptedFields: [] },
      location: {}, salary: { currency: "THB", visible: true }, positionsAvailable: 1, requireCoverLetter: false,
    });
    jobId = draft.id;
    expect(draft.status === "DRAFT" && /^job_[0-9A-Z]{26}$/.test(draft.id), `bad draft ${draft.id}`);
    const failed = await rejects(jobs.publishJob(jobId), "VALIDATION_ERROR");
    expect((failed.fieldErrors?.length ?? 0) >= 4, JSON.stringify(failed.fieldErrors));
    await jobs.updateJob(jobId, {
      title: "E2E Backend Engineer", description: "Build services", responsibilities: ["Write tests"],
      requirements: {
        requiredSkills: [{ name: "Python", level: "INTERMEDIATE", minimumYears: 1 }], preferredSkills: [{ name: "Docker", level: "BASIC" }],
        minimumExperienceYears: 1, educationLevel: "BACHELOR", acceptedFields: ["Computer Science"],
      },
      employmentType: "FULL_TIME", workArrangement: "HYBRID", location: { country: "Thailand", province: "Bangkok", district: "Pathum Wan" },
      salary: { minimum: 35000, maximum: 50000, currency: "THB", visible: true },
      applicationDeadline: "2099-10-31T16:59:59.000Z", positionsAvailable: 2, requireCoverLetter: false,
    });
    const open = await jobs.publishJob(jobId);
    expect(open.status === "OPEN" && !!open.publishedAt, "not published");
    const pub = await jobs.getJob(jobId);
    expect(pub.location.district === "Pathum Wan" && pub.salary.minimum === 35000, "public read mismatch");
  });
  await step("jobs: resume template attach, read, delete", async () => {
    const t = await jobs.attachResumeTemplate(jobId, new File(["%PDF-1.7 template"], "Template.pdf", { type: "application/pdf" }));
    expect(t.fileName === "Template.pdf" && t.sizeBytes === 17, JSON.stringify(t));
    expect((await jobs.getResumeTemplate(jobId))?.id === t.id, "template not found");
    await jobs.deleteResumeTemplate(jobId);
    expect((await jobs.getResumeTemplate(jobId)) === null, "template not deleted");
  });
  await step("jobs: close, reopen; deleting an open job is refused", async () => {
    expect((await jobs.closeJob(jobId)).status === "CLOSED", "not closed");
    expect((await jobs.reopenJob(jobId)).status === "OPEN", "not reopened");
    await rejects(jobs.deleteJob(jobId), "INVALID_STATE");
  });
  await step("jobs: unknown id is NOT_FOUND; Thai duplicate skill is a readable VALIDATION_ERROR", async () => {
    await rejects(jobs.getJob("job_does_not_exist"), "NOT_FOUND");
    const bad = await rejects(jobs.createJob({
      title: "ครู", description: "", responsibilities: [],
      requirements: {
        requiredSkills: [{ name: "ภาษาไทย", level: "BASIC", minimumYears: 0 }, { name: "ภาษาไทย", level: "BASIC", minimumYears: 0 }],
        preferredSkills: [], minimumExperienceYears: 0, educationLevel: "NONE", acceptedFields: [],
      },
      location: {}, salary: { currency: "THB", visible: true }, positionsAvailable: 1, requireCoverLetter: false,
    }), "VALIDATION_ERROR");
    expect(bad.fieldErrors?.[0]?.message.includes("ภาษาไทย"), JSON.stringify(bad.fieldErrors));
  });
  await step("jobs: seekers are refused recruiter routes", async () => {
    await signInAs("SEEKER");
    await rejects(jobs.listMyJobs(), "FORBIDDEN");
  });

  // --- Job Discovery Service (REST; reads the two services above over gRPC) ---
  await step("discovery: match real profile vs real job", async () => {
    const m = await discovery.getMatchResult(jobId);
    expect(m.score > 0 && m.missingSkills.includes("Python") && m.explanation !== "", JSON.stringify(m));
  });
  await step("discovery: fit, search and recommendations include the job", async () => {
    const fit = await discovery.evaluateJobFit(jobId);
    expect(fit.id === jobId && fit.company.id === fit.companyId, JSON.stringify(fit));
    const found = await discovery.searchJobs({ query: fit.title });
    expect(found.some((j) => j.id === jobId), `search for "${fit.title}" missed ${jobId}`);
    const recs = await discovery.getRecommendations(100);
    expect(recs.some((j) => j.id === jobId), "recommendations missed the job");
    expect(recs.every((j, i) => i === 0 || recs[i - 1].match.score >= j.match.score), "not sorted by score");
  });
  await step("discovery: unknown job is 404", async () => {
    await rejects(discovery.getMatchResult("job_does_not_exist"), "JOB_NOT_FOUND");
  });

  // --- clean up what this run created ---
  await step("cleanup: close e2e job, delete profile", async () => {
    await profile.deleteProfile();
    expect((await profile.getProfile()) === null, "profile still there");
    await signInAs("RECRUITER");
    await jobs.closeJob(jobId);
  });

  console.log(failures === 0 ? "\nALL PASSED" : `\n${failures} FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}

void main();
