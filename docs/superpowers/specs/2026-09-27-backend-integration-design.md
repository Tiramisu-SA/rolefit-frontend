# Frontend ↔ Backend Integration — Design

**Date:** 2026-09-27
**Status:** Approved in brainstorming, pending written-spec review
**Service specs:**
- `rolefit-candidate-profile-service/docs/superpowers/specs/2026-09-27-profile-rest-crud-design.md` (REST CRUD, schema migration)
- `rolefit-job-posting-service/docs/superpowers/specs/2026-09-27-job-posting-grpc-design.md` (MongoDB model, lifecycle, gRPC contract)

## Goal

Replace the frontend's mock Candidate Profile and Job Posting layers with the real services:

- **Candidate Profile Service over REST.** The browser calls it directly.
- **Job Posting Service over gRPC.** The Next.js server is the gRPC client, through server actions.

Both services get full CRUD in the UI. That includes new recruiter pages for creating and editing jobs, and a profile page where each section is edited separately.

## Decisions from brainstorming

| Topic | Decision |
|---|---|
| Scope | Full stack: implement both services and wire the frontend |
| Identity | **Mock auth stays.** Fixed dev user IDs come from env. The seeker ID is sent as an `X-User-Id` header; the recruiter ID and company go as gRPC metadata |
| gRPC path | Approach A: the Next.js server is the gRPC client (server actions + `@grpc/grpc-js`). No proxy, no protobuf code generation |
| Profile schema | The ER diagram. Migration 003 brings any earlier state to it, and is safe to re-run |
| Job shape | The agreed JSON document, stored as-is in MongoDB |
| Other seeker features | Job Discovery, Resume Preparation and Application stay **frontend mocks**, but now read **real** jobs and the real profile |
| CRUD | Full CRUD per profile table, `DeleteJob` (drafts only), `DeleteResumeTemplate` |

## Non-goals

- Real authentication. The `origin/feat/supabase-auth` branch isn't merged yet. All identity reads go through one helper (`src/lib/identity.ts`), so merging that branch later only swaps that file.
- Real Job Discovery, Resume Preparation or Application services, and real AI.
- A company service. Company display data stays a static frontend list.

## System topology

```
Browser ──REST/JSON + X-User-Id──────────────► Candidate Profile Svc  REST :3001 ──► Supabase Postgres
   │                                                                  gRPC :50051 (for Job Discovery)
   └─ server actions ─► Next.js server :3000 ──gRPC + metadata──────► Job Posting Svc      gRPC :50052 ──► MongoDB
                                               (x-user-id, x-company-id)                  HTTP :3002 (/health only)
```

### Environment variables

These are listed here so they can be set by hand. Nothing here writes `.env` files.

| Repo | Variable | Example | Scope |
|---|---|---|---|
| frontend | `NEXT_PUBLIC_CANDIDATE_PROFILE_API_URL` | `http://localhost:3001` | browser |
| frontend | `NEXT_PUBLIC_DEV_SEEKER_USER_ID` | any UUID, e.g. `3f1c2b7e-9a4d-4c1e-8b2a-5d6e7f809a1b` | browser |
| frontend | `JOB_POSTING_GRPC_URL` | `localhost:50052` | server only |
| frontend | `DEV_RECRUITER_USER_ID` | `user_4a80fdb2` | server only |
| frontend | `DEV_RECRUITER_COMPANY_ID` | `co-brightline` | server only |
| profile svc | `CORS_ORIGIN` | `http://localhost:3000` | — |
| job posting svc | `HTTP_PORT` / `GRPC_PORT` | `3002` / `50052` | — |

## Frontend architecture

### Types (`src/lib/types.ts`)

The types now mirror the services. Old mock-only fields go away.

- **`JobPosting`** matches the job JSON, with `id` in place of `_id` and ISO string dates:
  - `requirements { requiredSkills[], preferredSkills[], minimumExperienceYears, educationLevel, acceptedFields[] }`
  - `employmentType?`, `workArrangement?`
  - `location { country?, province?, district? }`
  - `salary { minimum?, maximum?, currency, visible }`
  - `applicationSettings { applicationDeadline?, positionsAvailable, resumeTemplateId?, requireCoverLetter }`
  - `status: 'DRAFT' | 'OPEN' | 'CLOSED'`, `publishedAt?`, `createdAt`, `updatedAt`
- **`JobPostingInput`** holds the editable fields and is used by the form. **`JobWithCompany`** is `JobPosting & { company: Company }`.
- **`CandidateProfile`** matches the REST `Profile` JSON, plus the input types (`ProfileBasicsInput`, `SkillInput`, `ExperienceInput`, …). **`initials`** and **`completeness`** are no longer stored. They're worked out by `profileInitials()` and `profileCompleteness()` in `src/lib/profile.ts`.
- **Shared enums** (`EmploymentType`, `WorkArrangement`, `SkillLevel`, `EducationLevel`) use the service values (`FULL_TIME`, …).
- **`src/lib/labels.ts`** maps enums to display text (`FULL_TIME` → "Full-time", `ONSITE` → "On-site", …) and has helpers:
  - `formatLocation(loc)` → "Pathum Wan, Bangkok, Thailand"
  - `experienceLevelLabel(years)` → Internship / Entry level / Mid level / Senior (0 / 1–2 / 3–4 / 5+)
  - `formatSalary(salary)`, which returns `null` when `visible` is false

### Identity (`src/lib/identity.ts`)

- `seekerUserId()` returns `process.env.NEXT_PUBLIC_DEV_SEEKER_USER_ID`, and throws a clear configuration error if it isn't set.
- `recruiterCaller()` returns `{ userId, companyId }` from the server-only env vars. It's marked `server-only`.
- The existing localStorage role switch (`role-context.tsx`) is **unchanged**. It still decides which area the user sees.

### Errors (`src/lib/api/errors.ts`)

- `ApiError extends Error { code: string; status?: number; fieldErrors?: { field: string; message: string }[] }` is the single error type the UI sees.
- It replaces `MockApiError`. Mock layers throw `ApiError` with code `MOCK_ERROR`.
- `?mockError=1` still works, for the mock layers only.

### Candidate Profile client (`src/lib/api/candidate-profile.ts`)

- A `request()` helper built on `fetch` to `NEXT_PUBLIC_CANDIDATE_PROFILE_API_URL`:
  - It always sends `X-User-Id`.
  - It parses `{ error: { code, message, details } }` into an `ApiError`.
  - A network failure becomes `ApiError('SERVICE_UNAVAILABLE', "Can't reach the profile service. Please try again.")`.
- One function per endpoint:
  - Profile: `getProfile()` (returns **`null`** on 404), `createProfile`, `updateBasics` (PATCH), `deleteProfile`
  - Children: `addSkill`, `updateSkill`, `deleteSkill`, and the same for experience, education and projects
  - Preferences: `savePreferences`, `deletePreferences`
  - Import: `importResume(file)`, `confirmProfile(document)`
- `importResume` sends the `File` as the raw body, with `Content-Type` from `file.type` (worked out from the extension when `file.type` is empty) and an `X-File-Name` header.

### Job Posting over gRPC

| File | Role |
|---|---|
| `proto/job-posting.proto` | A copy of the service's contract (same package, `rolefit.jobposting.v1`) |
| `src/lib/grpc/job-posting-client.ts` | `server-only`. One shared client per server process, created on first use. Loads the proto with `@grpc/proto-loader` (`keepCase`, `enums: String`, `defaults`, `oneofs`). Wraps each unary call in a Promise with a **5 s deadline** and the recruiter metadata when asked |
| `src/lib/grpc/job-mapper.ts` | Pure functions: proto `Job` → `JobPosting` (removes enum prefixes, turns `""` into `undefined`) and `JobPostingInput` → proto `JobInput`. Also maps a gRPC error to an `ApiError`: status → code, `details` → message, `x-validation-errors` metadata → `fieldErrors` |
| `src/lib/api/job-posting-actions.ts` | `"use server"`. One action per RPC. Each **returns** an `ActionResult<T> = { ok: true; data: T } \| { ok: false; error: SerializedApiError }` and never throws, because Next.js hides thrown server-action messages in production |
| `src/lib/api/job-posting.ts` | A browser-side wrapper with the functions pages call. It unwraps `ActionResult` and throws `ApiError` on failure |

Wrapper functions:

- Recruiter (sent with recruiter metadata):
  - `listMyJobs({ status?, query? })`: calls `ListJobs` with `company_id` = the recruiter's company and `limit` 100
  - `getMyJob(id)`, `createJob(input)`, `updateJob(id, input)`, `deleteJob(id)`
  - `publishJob`, `closeJob`, `reopenJob`
  - `attachResumeTemplate(id, file)`: the action receives `FormData`
  - `getResumeTemplate(id)` (metadata only), `deleteResumeTemplate(id)`
  - `getRecruiterCompany()`: returns the recruiter's `Company` for the shell
- Seeker (no metadata):
  - `listOpenJobs({ query? })`: calls `ListJobs` with status `OPEN` and `limit` 100
  - `getJob(id)`

Every function returns jobs with `company` attached (`JobWithCompany`).

The plan's first task is to check these against the Next 16 docs bundled in `node_modules/next/dist/docs/` (required by `AGENTS.md`) and adjust:

- how server actions are defined and called from client components
- the `serverActions.bodySizeLimit` setting (raised to `3mb` for the 2 MB template upload)
- `serverExternalPackages` for `@grpc/grpc-js` and `@grpc/proto-loader`
- including `proto/**` in the server output (`outputFileTracingIncludes`)

### Companies (`src/lib/companies.ts`)

- The existing company list moves here from `lib/mock/companies.ts`.
- `companyFor(id)` returns the matching company. For an unknown ID it returns a generic fallback: the ID as the name, initials from the ID, a neutral colour.

### Mock services on real data

`_store.ts` keeps **only** `resumeDrafts` and `applications`. It no longer holds jobs or candidates.

- **Job Discovery (mock):**
  - `searchJobs` and `getRecommendations` call `listOpenJobs()` and `getProfile()`.
  - Filters are applied in the browser.
  - `computeMatch(profile, job)` is rewritten for the new shapes:
    - Required skill names are compared ignoring case.
    - Experience is `totalExperienceMonths / 12` against `minimumExperienceYears`.
    - Education scores 100 if the profile has any education, otherwise 50.
    - Preferences compare employment type, work arrangement and `preferredLocations` against `location.province`.
    - The existing weights (50 / 25 / 10 / 15) stay.
  - With **no profile**, matching uses an empty profile, and the pages show a "Create your profile for accurate matches" banner.
- **Resume Preparation (mock):** builds sections from the real profile and job. The format is `company` when `applicationSettings.resumeTemplateId` is set.
- **Application (mock):**
  - `submitApplication` checks the real job is `OPEN`.
  - At submit time it stores `candidate: { id, name, initials, headline, email }` inside the application. The recruiter view therefore doesn't need to read other users' profiles.
  - The seed applications point at the job service's seed IDs (`job_seed_<slug>`) and keep their mock candidate summaries.

### Pages and components

- **Profile (`/seeker/profile`),** one section edited at a time:
  - **No profile** (`getProfile() === null`): an empty state offering **Upload resume** (import → review → `confirmProfile`) and **Start from scratch** (a basics form → `createProfile`).
  - **Basics and summary:** each card has its own Edit / Save / Cancel, saved with `updateBasics`.
  - **Skills:** chips, each with an optional proficiency picker and a remove button, plus an "Add skill" input. A duplicate shows the server's `DUPLICATE_SKILL` message next to the input.
  - **Experience, education, projects:** a list with a per-row Edit (inline form), a per-row Delete (confirmation dialog) and an "Add" button.
  - **New inputs:**
    - Experience: "I currently work here", which clears and disables the end date.
    - Education: field of study and GPA.
    - Skills: proficiency.
    - Preferences: preferred roles and salary currency.
  - **Preferences:** Edit / Save through `savePreferences`, and "Clear preferences" through `deletePreferences`.
  - **Import review:** the whole draft is editable, reusing the section editors in "draft mode" where changes stay local. **Confirm** saves the whole draft with `confirmProfile`, replacing the current profile after a warning if one exists.
  - **Danger zone:** "Delete profile" behind a confirmation dialog → `deleteProfile` → back to the empty state.
  - Field errors from `ApiError.fieldErrors` show next to the matching input.
- **Recruiter jobs (`/recruiter/jobs`):**
  - The table reads `listMyJobs()`. Status tabs are All / Open / Draft / Closed. "Published" becomes "Open" everywhere.
  - Row actions:
    - Draft: Publish, Edit, **Delete**, with confirmation
    - Open: Close (confirmation, as today) and Edit
    - Closed: Reopen
  - The job title links to the edit page.
- **New `/recruiter/jobs/new` and `/recruiter/jobs/[id]/edit`,** sharing `components/recruiter/job-form/`:
  - **Basics:** title, description, responsibilities (list editor)
  - **Requirements:**
    - required skills: rows of name + level + minimum years
    - preferred skills: rows of name + level
    - minimum experience years
    - education level
    - accepted fields (chips)
  - **Employment:** employment type, work arrangement, country / province / district
  - **Salary:** minimum, maximum, currency, "Show salary to candidates"
  - **Application settings:** deadline (`datetime-local`, sent as ISO), positions, require cover letter, resume template upload / replace / **Remove**
  - **Actions:** **Save draft** (create or update), **Save & publish** (save, then publish), and **Delete** on the edit page for drafts. A closed job shows read-only with a "Reopen to edit" note.
  - `validateJobForm(input, { forPublish })` in `job-form/validation.ts` repeats the server's rules, so errors show before sending. Server `fieldErrors` are shown too.
- **Seeker job pages:**
  - Detail, card and resume pages use the new fields and `labels.ts`.
  - `team` is removed from the UI.
  - Requirements show as: required skills with level and years; "Experience: N+ years"; "Education: Bachelor's in CS, CE or SE"; preferred skills.
  - Salary is hidden when `visible` is false.
  - A CLOSED job is shown read-only with "No longer accepting applications".
- **Recruiter shell and dashboard:** company from `getRecruiterCompany()`. Jobs come from `listMyJobs()`, and `CURRENT_COMPANY_ID` is removed.

### Deleted

- `lib/mock/jobs.ts` and `lib/mock/candidates.ts`. The sample resume moves to the profile service's placeholder AI adapter. The applicant summaries stay in `lib/mock/applications.ts`.
- `lib/mock/companies.ts` becomes `lib/companies.ts`.
- `CURRENT_CANDIDATE_ID`, `CURRENT_COMPANY_ID`, `MockApiError`.

## Error handling in the UI

- Pages keep the current `useAsync` → `ErrorState` / `onRetry` pattern. `ApiError.message` is always safe to show.
- For mutations:
  - A toast on success.
  - A toast on failure, **unless** the error has `fieldErrors`. Those show next to the fields, with a summary at the top of the form.
- gRPC `UNAVAILABLE` or `DEADLINE_EXCEEDED` becomes `ApiError('SERVICE_UNAVAILABLE', "Job service is unavailable. Please try again.")`.
- A missing env var fails with a clear configuration message, not a generic "undefined" error.

## Testing

- **Add `vitest`** (dev dependency, `npm test`), for pure modules only:
  - `job-mapper` (both directions, enum prefixes, unset values, error mapping)
  - the `ActionResult` unwrap
  - `candidate-profile` `request()` error parsing, with `fetch` stubbed
  - `computeMatch`
  - `labels`
  - `profileCompleteness` / `profileInitials`
  - `validateJobForm`
- **Always:** `npx tsc --noEmit`, `npm run lint`, `npm run build`.
- **Manual end-to-end checklist,** with all three services running and the job service seeded:
  - Create, read, update and delete every profile section, plus import → confirm.
  - Create a job → save draft → edit → publish → it appears in seeker search → close → reopen → delete a draft.
  - Upload, replace and remove a template.
  - Stop each service and check the unavailable messages.

## Cross-repo delivery order

1. Candidate Profile Service (spec in its repo)
2. Job Posting Service (spec in its repo)
3. Frontend (this spec)

Each repo gets its own plan in `docs/superpowers/plans/` and works on the branch `feat/backend-integration`.
