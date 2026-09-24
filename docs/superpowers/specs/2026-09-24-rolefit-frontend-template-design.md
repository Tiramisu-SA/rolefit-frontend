# RoleFit Frontend Template — Design Spec

**Date:** 2026-09-24
**Status:** Approved UI mockups ([canvas](https://claude.ai/artifact/LnGJZkXqb8uTnfALWmkpjG)); spec pending review

## Goal

A Next.js web template for RoleFit that covers both actors from the architecture docs
(Job Seeker and Recruiter) with the approved UI. **No backend connection yet**: every
page reads from a typed mock service layer that mirrors the backend microservices, so
wiring real APIs later only changes that layer.

## Non-goals

- Real authentication, sessions, or authorization.
- HTTP calls to any service, API gateway, or AI provider.
- Persistence beyond the browser (mock mutations live in memory for the session).
- Notifications, deadline reminders (FR-17 beyond status display), company profile management (FR-03).

## Stack

- Next.js (latest, App Router) + TypeScript (strict), `src/` directory
- Tailwind CSS v4 + shadcn/ui (Radix) components, lucide-react icons
- Font: Plus Jakarta Sans via `next/font/google`
- `next-themes` for light/dark mode
- Vitest for unit tests of `src/lib`

## Design tokens (from approved mockups)

Defined as CSS variables in `globals.css` and mapped to the shadcn theme:

| Token | Light | Use |
|---|---|---|
| background | `#F6F7FB` | page ground |
| card | `#FFFFFF` | surfaces |
| foreground | `#0F172A` | primary text |
| muted-foreground | `#64748B` | secondary text |
| border | `#E2E8F0` | borders |
| primary | `#4F46E5` | actions, active nav (white text) |
| primary-soft | `#EEF2FF` / text `#4338CA` | active tabs, chips |
| brand-deep | `#1E1B4B` | recruiter panels, login panel |
| match-strong | `#047857` on `#ECFDF5` | score ≥ 80 |
| match-good | `#B45309` on `#FFFBEB` | score 60–79 |
| match-partial | `#475569` on `#F1F5F9` | score < 60 |
| destructive | `#B91C1C` on `#FEF2F2` | Rejected / Closed |

Dark mode gets matching tokens. Radius 10–20px. Buttons and icon buttons are at least 44px tall.

## Routes

| Route | Screen | Covers |
|---|---|---|
| `/` | Landing | — |
| `/login` | Sign in with Job Seeker / Recruiter switch | supporting |
| `/register` | Register with the same role switch | supporting |
| `/seeker/dashboard` | Recommendations, application summary, profile completeness | BUC-2 |
| `/seeker/jobs` | Search, filters, recommended/all tabs, job cards with match ring | BUC-2A |
| `/seeker/jobs/[id]` | Job detail + match score, breakdown, strengths/gaps, explanation | BUC-2A |
| `/seeker/jobs/[id]/resume` | Tailor resume: format choice, emphasized sections, preview, approve & submit | BUC-2B, 2C |
| `/seeker/applications` | Application list with progress bar and status | BUC-2C |
| `/seeker/profile` | Upload resume → review extracted data → editable profile | Supporting flow |
| `/recruiter/dashboard` | Stats + recent applicants | BUC-1/3 |
| `/recruiter/jobs` | Postings table with status tabs and publish/close/reopen | BUC-1 |
| `/recruiter/jobs/new` | Job form + optional resume template upload | BUC-1 |
| `/recruiter/jobs/[id]/edit` | Same form, prefilled | BUC-1 |
| `/recruiter/jobs/[id]/applicants` | Applicant list + detail panel + status update | BUC-3 |

Screens not drawn in the mockups (dashboards, profile, register, job form) follow the same
components and tokens.

## Architecture

```
src/
  app/
    (public)/page.tsx, login/, register/
    seeker/layout.tsx          # top-nav shell + role guard
    seeker/...pages
    recruiter/layout.tsx       # sidebar shell + role guard
    recruiter/...pages
  components/
    ui/                        # shadcn primitives
    brand/                     # Logo, MatchRing, MatchBadge, StatusBadge, CompanyAvatar
    seeker/                    # SeekerNav, JobCard, JobFilters, MatchPanel, ResumePreview, ...
    recruiter/                 # RecruiterSidebar, JobsTable, JobForm, ApplicantList, ApplicantDetail, ...
  lib/
    types.ts                   # domain types
    match.ts                   # score → tier helpers
    auth/role-context.tsx      # mock auth
    api/                       # mock service layer (one file per backend service)
      candidate-profile.ts
      job-posting.ts
      job-discovery.ts
      resume-preparation.ts
      application.ts
    mock/                      # seed data
```

### Mock service layer

Each file in `src/lib/api/` exports async functions named after the operations in the
Service–Operations–Collaborators table, returning typed data from `src/lib/mock/`
after a short simulated delay:

- `candidate-profile.ts`: `importResume`, `confirmExtractedProfile`, `updateProfile`, `getProfile`
- `job-posting.ts`: `createJob`, `updateJob`, `publishJob`, `closeJob`, `reopenJob`, `getJob`, `listJobs`, `attachResumeTemplate`, `getResumeTemplate`
- `job-discovery.ts`: `searchJobs`, `getRecommendations`, `evaluateJobFit`, `getMatchResult`
- `resume-preparation.ts`: `generateTailoredResume`, `getResumeDraft`, `editResumeDraft`, `selectResumeFormat`, `approveResume`, `getApprovedResume`
- `application.ts`: `submitApplication`, `getApplication`, `listMyApplications`, `listApplicantsForJob`, `updateApplicationStatus`

Mutations change an in-memory copy of the seed data, so actions (publish a job, update a
status, submit an application) visibly work until the page is reloaded. Pages only
import from `src/lib/api`, never from `src/lib/mock`.

### Mock auth

`RoleProvider` (client context) stores `{ role: 'seeker' | 'recruiter', name }` in
localStorage. `/login` and `/register` set it and redirect to that role's dashboard.
`seeker/layout.tsx` and `recruiter/layout.tsx` redirect to `/login` if the stored role
doesn't match. Sign out clears it. This is presentation only, not security.

### Data flow

Pages are client components where they need interaction (filters, tabs, status updates)
and call the mock API in effects or event handlers, showing skeletons while loading.
Static pages (landing) are server components.

## Error handling and empty states

- Each data view has loading (skeleton), empty ("No jobs match these filters" with a
  "Clear filters" action), and error ("Couldn't load jobs" with Retry) states.
- Mock API functions can simulate failure through a `?mockError=1` query param for
  demoing error states.
- Toasts (shadcn `sonner`) confirm mutations: status updated, job published, application submitted.

## Accessibility and responsiveness

- Semantic landmarks, labeled inputs, `aria-current` on active nav, visible focus rings.
- Text contrast ≥ 4.5:1; status never shown by color alone (always a text label).
- Breakpoints 375 / 768 / 1024 / 1440. The seeker top nav collapses to a sheet menu;
  the recruiter sidebar becomes a sheet on < 1024px; the job detail match panel stacks
  under the content on mobile.
- `prefers-reduced-motion` respected.

## Testing

- Vitest unit tests for `src/lib/match.ts` (tier boundaries) and the mock API
  (filters in `searchJobs`, status transitions in `updateApplicationStatus`,
  `publishJob`/`closeJob`/`reopenJob`, `submitApplication` rejecting closed jobs).
- `npm run lint`, `npm run build`, and `npm test` must pass.
- Manual check of key routes in the browser at desktop and mobile widths.
