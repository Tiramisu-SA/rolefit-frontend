// End-to-end smoke test: drives the frontend's API modules against running services.
//
//   Candidate Profile Service (REST) + Job Posting Service (gRPC, seeded) must be running.
//   npx tsx --conditions=react-server scripts/e2e-smoke.ts
//
// Env (defaults match the local dev setup):
//   NEXT_PUBLIC_CANDIDATE_PROFILE_API_URL, NEXT_PUBLIC_DEV_SEEKER_USER_ID,
//   JOB_POSTING_GRPC_URL, DEV_RECRUITER_USER_ID, DEV_RECRUITER_COMPANY_ID
// It deletes the profile it creates. Its test job ends CLOSED (only drafts can be
// deleted), so run it against a dev database, not one you care about.

import { randomUUID } from "node:crypto";

process.env.NEXT_PUBLIC_CANDIDATE_PROFILE_API_URL ??= "http://localhost:3001";
process.env.NEXT_PUBLIC_DEV_SEEKER_USER_ID = randomUUID(); // a fresh seeker every run
process.env.JOB_POSTING_GRPC_URL ??= "localhost:50052";
process.env.DEV_RECRUITER_USER_ID ??= "user_4a80fdb2";
process.env.DEV_RECRUITER_COMPANY_ID ??= "co-brightline";

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
  const actions = await import("../src/lib/api/job-posting-actions");
  const { ApiError, unwrap } = await import("../src/lib/api/errors");
  const { computeMatch } = await import("../src/lib/match");

  const rejects = async (p: Promise<unknown>, code: string) => {
    try {
      await p;
    } catch (e) {
      expect(e instanceof ApiError && e.code === code, `expected ${code}, got ${e instanceof ApiError ? e.code : String(e)}`);
      return e as InstanceType<typeof ApiError>;
    }
    throw new Error(`expected ${code}, but it succeeded`);
  };

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

  // --- Job Posting Service (gRPC via Server Actions) ---
  let jobId = "";
  await step("jobs: recruiter list includes own drafts; public list is OPEN only", async () => {
    const mine = unwrap(await actions.listMyJobsAction());
    expect(mine.some((j) => j.status === "DRAFT"), "no draft in own list");
    expect(mine.every((j) => j.companyId === "co-brightline"), "other company in own list");
    const open = unwrap(await actions.listOpenJobsAction());
    expect(open.length > 0 && open.every((j) => j.status === "OPEN"), "public list not OPEN only");
    const q = unwrap(await actions.listOpenJobsAction({ query: "react" }));
    expect(q.length > 0, "query returned nothing");
  });
  await step("jobs: create draft, publish needs full details, then publishes", async () => {
    const draft = unwrap(await actions.createJobAction({
      title: "E2E Backend Engineer", description: "", responsibilities: [],
      requirements: { requiredSkills: [], preferredSkills: [], minimumExperienceYears: 0, educationLevel: "NONE", acceptedFields: [] },
      location: {}, salary: { currency: "THB", visible: true }, positionsAvailable: 1, requireCoverLetter: false,
    }));
    jobId = draft.id;
    expect(draft.status === "DRAFT" && /^job_[0-9A-Z]{26}$/.test(draft.id), `bad draft ${draft.id}`);
    const failed = await actions.publishJobAction(jobId);
    expect(!failed.ok && failed.error.code === "VALIDATION_ERROR" && (failed.error.fieldErrors?.length ?? 0) >= 4, JSON.stringify(failed));
    unwrap(await actions.updateJobAction(jobId, {
      title: "E2E Backend Engineer", description: "Build services", responsibilities: ["Write tests"],
      requirements: {
        requiredSkills: [{ name: "Python", level: "INTERMEDIATE", minimumYears: 1 }], preferredSkills: [{ name: "Docker", level: "BASIC" }],
        minimumExperienceYears: 1, educationLevel: "BACHELOR", acceptedFields: ["Computer Science"],
      },
      employmentType: "FULL_TIME", workArrangement: "HYBRID", location: { country: "Thailand", province: "Bangkok", district: "Pathum Wan" },
      salary: { minimum: 35000, maximum: 50000, currency: "THB", visible: true },
      applicationDeadline: "2099-10-31T16:59:59.000Z", positionsAvailable: 2, requireCoverLetter: false,
    }));
    const open = unwrap(await actions.publishJobAction(jobId));
    expect(open.status === "OPEN" && !!open.publishedAt, "not published");
    const pub = unwrap(await actions.getJobAction(jobId));
    expect(pub.location.district === "Pathum Wan" && pub.salary.minimum === 35000, "public read mismatch");
  });
  await step("jobs: resume template attach, read, delete", async () => {
    const fd = new FormData();
    fd.set("file", new File(["%PDF-1.7 template"], "Template.pdf", { type: "application/pdf" }));
    const t = unwrap(await actions.attachResumeTemplateAction(jobId, fd));
    expect(t.fileName === "Template.pdf" && t.sizeBytes === 17, JSON.stringify(t));
    expect(unwrap(await actions.getResumeTemplateAction(jobId))?.id === t.id, "template not found");
    unwrap(await actions.deleteResumeTemplateAction(jobId));
    expect(unwrap(await actions.getResumeTemplateAction(jobId)) === null, "template not deleted");
  });
  await step("jobs: close, reopen; deleting an open job is refused", async () => {
    expect(unwrap(await actions.closeJobAction(jobId)).status === "CLOSED", "not closed");
    expect(unwrap(await actions.reopenJobAction(jobId)).status === "OPEN", "not reopened");
    const del = await actions.deleteJobAction(jobId);
    expect(!del.ok && del.error.code === "INVALID_STATE", JSON.stringify(del));
  });
  await step("jobs: unknown id is NOT_FOUND; Thai duplicate skill is a readable VALIDATION_ERROR", async () => {
    const nf = await actions.getJobAction("job_does_not_exist");
    expect(!nf.ok && nf.error.code === "NOT_FOUND", JSON.stringify(nf));
    const bad = await actions.createJobAction({
      title: "ครู", description: "", responsibilities: [],
      requirements: {
        requiredSkills: [{ name: "ภาษาไทย", level: "BASIC", minimumYears: 0 }, { name: "ภาษาไทย", level: "BASIC", minimumYears: 0 }],
        preferredSkills: [], minimumExperienceYears: 0, educationLevel: "NONE", acceptedFields: [],
      },
      location: {}, salary: { currency: "THB", visible: true }, positionsAvailable: 1, requireCoverLetter: false,
    });
    expect(!bad.ok && bad.error.fieldErrors?.[0]?.message.includes("ภาษาไทย"), JSON.stringify(bad));
  });
  await step("match: real profile vs real job", async () => {
    const p = (await profile.getProfile())!;
    const job = unwrap(await actions.getJobAction(jobId));
    const m = computeMatch(p, job);
    expect(m.score > 0 && m.missingSkills.includes("Python"), JSON.stringify(m.breakdown));
  });

  // --- clean up what this run created ---
  await step("cleanup: close e2e job, delete profile", async () => {
    unwrap(await actions.closeJobAction(jobId));
    await profile.deleteProfile();
    expect((await profile.getProfile()) === null, "profile still there");
  });

  console.log(failures === 0 ? "\nALL PASSED" : `\n${failures} FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}

void main();
