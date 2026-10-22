# Frontend Backend Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (Native). This plan is deliberately minimal, as the user asked: the spec holds the contracts and UI details. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the mock Candidate Profile layer (with REST) and the mock Job Posting layer (with gRPC through server actions). Give the other mocks real data. Add per-section profile CRUD and the recruiter job form.
**Architecture:** The browser `fetch`es the profile service directly. Client pages call `lib/api/job-posting.ts`, which unwraps `ActionResult` from `"use server"` actions; those use a server-only `@grpc/grpc-js` client. Pure mappers sit between the proto/REST shapes and the UI types.
**Tech Stack:** Next 16.3 (App Router), React 19, TypeScript, Tailwind v4 + shadcn (base-ui), @grpc/grpc-js, @grpc/proto-loader, vitest.
**Spec:** `docs/superpowers/specs/2026-09-27-backend-integration-design.md` (the service contracts are in the two service repos' specs)

## Global Constraints
- Read `node_modules/next/dist/docs/` before writing Next-specific code (`AGENTS.md`).
- New dependencies are only `@grpc/grpc-js`, `@grpc/proto-loader`, `server-only`, and the dev dependency `vitest`.
- The UI shows "Open", never "Published". Enum values come from the services; display text comes from `lib/labels.ts`.
- Recruiter identity and the gRPC URL are server-only env vars and must never be `NEXT_PUBLIC_`.
- Never write `.env` files. The env table in the spec is for the user.
- Keep the existing visual style: tokens, components, and the `useAsync` / `ErrorState` / `EmptyState` / `ListSkeleton` patterns.

## Review Focus
- A server action error in a **production build** must still show the service's message, not Next's generic one. Test the `ActionResult` round trip in Task 2, then check by hand with `npm run build && npm start`.
- A new seeker with no profile: every seeker page (dashboard, jobs, job detail, resume) loads with the "create your profile" banner and doesn't crash (Task 5).
- A job whose salary has `visible: false`, or has no salary, never shows a salary (`formatSalary` test in Task 1).
- An import file with an empty `file.type` (common for `.docx` on Windows) still sends the right `Content-Type` (Task 3 test).
- Opening the edit page for another company's job or an unknown ID → the not-found state, not a crash (Task 7).

---

### Task 1: Setup, types, labels, companies, identity
**Files:**
- `package.json` (dependencies, plus `"test": "vitest run"`), `next.config.ts`, `proto/job-posting.proto` (copied from the service)
- `src/lib/types.ts`, `src/lib/labels.ts`, `src/lib/profile.ts`, `src/lib/companies.ts`, `src/lib/identity.ts`, `src/lib/api/errors.ts`
- `src/lib/labels.test.ts`, `src/lib/profile.test.ts`

**Steps:**
- [ ] `npm install`, then `npm install @grpc/grpc-js @grpc/proto-loader server-only` and `npm install -D vitest`.
- [ ] Read the Next docs on server actions (`"use server"`, calling them from client components, `serverActions.bodySizeLimit`), `serverExternalPackages` and `outputFileTracingIncludes`. Set in `next.config.ts`:
  - `serverExternalPackages: ['@grpc/grpc-js', '@grpc/proto-loader']`
  - `experimental.serverActions.bodySizeLimit: '3mb'`, or wherever the docs put it
  - `proto/**` included for server routes
- [ ] Types and helpers as the spec describes: `JobPosting`, `JobPostingInput`, `JobWithCompany`, `CandidateProfile` and its inputs, the enums, `ApiError` / `SerializedApiError` / `ActionResult<T>`, `profileInitials`, `profileCompleteness`, `companyFor`, `seekerUserId`, `recruiterCaller`.
- [ ] Failing tests for `labels` (every enum label, `formatLocation`, `experienceLevelLabel` at the boundaries, `formatSalary` hidden or missing) and for `profile` helpers. Then implement until green: `npm test`.
- [ ] Commit. The app won't typecheck until Task 6; that's expected.

### Task 2: gRPC client, mapper, server actions, wrapper
**Files:** `src/lib/grpc/job-posting-client.ts` (server-only), `src/lib/grpc/job-mapper.ts` + `job-mapper.test.ts`, `src/lib/api/job-posting-actions.ts` (`"use server"`), `src/lib/api/job-posting.ts` + `job-posting.test.ts`.
**Produces:**
- Wrapper functions, as named in the spec: `listMyJobs`, `getMyJob`, `createJob`, `updateJob`, `deleteJob`, `publishJob`, `closeJob`, `reopenJob`, `attachResumeTemplate`, `getResumeTemplate`, `deleteResumeTemplate`, `getRecruiterCompany`, `listOpenJobs`, `getJob`.
- `unwrap<T>(r: ActionResult<T>): T`.
- `toJobPosting(proto)`, `toProtoJobInput(input)`, `grpcErrorToApiError(err)`.

**Steps:**
- [ ] Failing tests:
  - Mapper: proto → domain and back; prefixes stripped and added; `""` becomes `undefined`.
  - Error mapping for each gRPC code, including `x-validation-errors` → `fieldErrors`, and `UNAVAILABLE`/`DEADLINE_EXCEEDED` → `SERVICE_UNAVAILABLE`.
  - `unwrap` throws an `ApiError` with the code, message and `fieldErrors` preserved.
- [ ] Implement until green. The client has a 5 s deadline, and adds metadata `x-user-id` / `x-company-id` from `recruiterCaller()` for recruiter actions.
- [ ] Commit.

### Task 3: Candidate Profile REST client
**Files:** `src/lib/api/candidate-profile.ts`, `src/lib/api/candidate-profile.test.ts`.
- [ ] Failing tests with `fetch` stubbed:
  - the `X-User-Id` header is sent
  - an error body → `ApiError` with `details` as `fieldErrors`
  - a network failure → `SERVICE_UNAVAILABLE`
  - `getProfile` 404 → `null`
  - 204 → `undefined`
  - `importResume` with an empty `file.type` and a `.docx` name → the DOCX content type and `X-File-Name`
- [ ] Implement every function listed in the spec until green, then commit.

### Task 4: Mocks on real data
**Files:** `src/lib/api/_store.ts`, `src/lib/api/job-discovery.ts` (+ `job-discovery.test.ts` for `computeMatch`), `src/lib/api/resume-preparation.ts`, `src/lib/api/application.ts`, `src/lib/api/index.ts`, `src/lib/mock/applications.ts`. Delete `src/lib/mock/jobs.ts`, `candidates.ts` and `companies.ts`.
- [ ] Failing `computeMatch` tests:
  - skills matched ignoring case
  - experience from `totalExperienceMonths` against `minimumExperienceYears`
  - education 100 or 50
  - the preference points
  - an empty profile gives a low score without throwing
- [ ] Implement the spec's "Mock services on real data" section:
  - The seed applications use `job_seed_<slug>` IDs matching the job service seed, and carry embedded candidate summaries.
  - Mocks throw `ApiError('MOCK_ERROR')`.
- [ ] Commit.

### Task 5: Seeker pages on the new types
**Files:** `components/seeker/{job-card,job-filters,match-panel,resume-preview,application-row,seeker-shell}.tsx`, `app/seeker/{dashboard,jobs,jobs/[id],jobs/[id]/resume,applications}/page.tsx`.
- [ ] Switch to the new fields and `labels.ts`:
  - `team` removed
  - the requirements block built from the structured fields
  - salary hidden when not visible
  - a CLOSED job read-only with "No longer accepting applications"
  - filter values become enums
- [ ] Add the "Create your profile for accurate matches" banner wherever `getProfile()` returns `null`.
- [ ] `npx tsc --noEmit` passes for these files. Commit.

### Task 6: Profile page, per-section CRUD
**Files:** `app/seeker/profile/page.tsx`, `components/seeker/profile-sections.tsx`, `components/seeker/profile/*.tsx`. Create `components/seeker/profile/{empty-profile,danger-zone,confirm-dialog}.tsx`.
- [ ] Build the spec's profile section:
  - empty state (upload, or start from scratch)
  - basics and summary with their own Edit / Save
  - skills chips with proficiency, add and remove
  - experience, education and projects rows with per-row edit, delete (confirmation) and add
  - preferences save and clear
  - import review in draft mode → `confirmProfile` (warn when replacing an existing profile)
  - the delete-profile danger zone
  - `fieldErrors` shown next to inputs
- [ ] Run `npx tsc --noEmit` and `npm run lint`. Commit.

### Task 7: Recruiter pages + job form
**Files:**
- `components/recruiter/{jobs-table,recruiter-shell}.tsx`, `app/recruiter/{dashboard,jobs}/page.tsx`
- Create `app/recruiter/jobs/new/page.tsx`, `app/recruiter/jobs/[id]/edit/page.tsx`
- Create `components/recruiter/job-form/{job-form,skills-editor,list-editor,template-field}.tsx` and `validation.ts` + `validation.test.ts`

**Steps:**
- [ ] Failing `validateJobForm` tests. They mirror the service's rules: draft needs only a title; `forPublish` needs the full set; salary minimum ≤ maximum; duplicate skills; a past deadline.
- [ ] Implement:
  - The form as described in the spec, with Save draft / Save & publish / Delete draft, and template upload / replace / remove.
  - A closed job shown read-only.
  - The table's tabs become All / Open / Draft / Closed, plus Delete for drafts, and the title links to the edit page.
  - The shell and dashboard use `getRecruiterCompany()` and `listMyJobs()`.
- [ ] Run `npm test`, `npx tsc --noEmit`, `npm run lint` and `npm run build`. Commit.

### Task 8: End-to-end check
- [ ] With the three services running (the job service seeded, profile migration 003 applied) and the user's env set, run the spec's manual checklist, and check the Review Focus items in `npm run build && npm start`. Fix anything found, then commit.
- [ ] Update `README.md` with how to run it: env var names, start order, and `npm run seed`.
