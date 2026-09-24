# RoleFit Frontend Template Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Next.js web template for RoleFit (Job Seeker + Recruiter) that matches the approved mockups and runs entirely on a typed mock service layer.

**Architecture:** App Router pages grouped by role (`/seeker/*`, `/recruiter/*`), each with its own layout shell and a mock role guard. All data comes from `src/lib/api/*`, one module per backend microservice, with functions named after the operations in the architecture doc; they read and mutate an in-memory store seeded from `src/lib/mock/*`. Shared visual pieces (match ring, status badge, company avatar) live in `src/components/brand`.

**Tech Stack:** Next.js (latest, App Router) · TypeScript strict · Tailwind CSS v4 · shadcn/ui (Radix) · lucide-react · next-themes · sonner · Plus Jakarta Sans via `next/font/google`.

**Visual reference:** Approved canvas https://claude.ai/artifact/LnGJZkXqb8uTnfALWmkpjG (artboards: Landing, Sign in, Find jobs, Job detail & match, Tailor resume, My applications, Recruiter job postings, Review applicants). Page markup should reproduce those layouts with the components listed in each task.

## Global Constraints

- No network calls to any backend or AI provider. Pages import data only from `@/lib/api`, never from `@/lib/mock`.
- No automated tests this iteration. Verification = `npm run lint` + `npm run build` + a manual browser check.
- Do not run `git commit`; the user commits changes themselves.
- Colors come from CSS variables in `src/app/globals.css`; components use Tailwind token classes (`bg-primary`, `text-muted-foreground`, `bg-match-strong-soft`…), not raw hex.
- Interactive targets ≥ 44px tall (`h-11`) for primary buttons, icon buttons and nav items.
- Status and match level are always shown with a text label, never color alone.
- Icons: lucide-react only, no emoji. Icon-only buttons have `aria-label`.
- Breakpoints to check: 375, 768, 1024, 1440px. No horizontal page scroll.
- Copy is English; currency is THB (`฿`); dates formatted `d MMM yyyy` with `Intl.DateTimeFormat('en-GB')`.

---

## File Structure

```
src/
  app/
    layout.tsx                      root: font, ThemeProvider, RoleProvider, Toaster
    globals.css                     tokens + Tailwind v4 theme mapping
    page.tsx                        landing
    login/page.tsx
    register/page.tsx
    seeker/layout.tsx               SeekerShell + RoleGuard('seeker')
    seeker/dashboard/page.tsx
    seeker/jobs/page.tsx
    seeker/jobs/[id]/page.tsx
    seeker/jobs/[id]/resume/page.tsx
    seeker/applications/page.tsx
    seeker/profile/page.tsx
    recruiter/layout.tsx            RecruiterShell + RoleGuard('recruiter')
    recruiter/dashboard/page.tsx
    recruiter/jobs/page.tsx
    recruiter/jobs/new/page.tsx
    recruiter/jobs/[id]/edit/page.tsx
    recruiter/jobs/[id]/applicants/page.tsx
  components/
    ui/                             shadcn generated
    providers.tsx                   ThemeProvider + RoleProvider + Toaster
    brand/logo.tsx
    brand/company-avatar.tsx
    brand/match-ring.tsx
    brand/match-badge.tsx
    brand/status-badge.tsx
    brand/theme-toggle.tsx
    brand/page-states.tsx           EmptyState, ErrorState, ListSkeleton
    auth/role-guard.tsx
    auth/role-switch.tsx            Job Seeker / Recruiter segmented control
    seeker/seeker-shell.tsx
    seeker/job-card.tsx
    seeker/job-filters.tsx
    seeker/match-panel.tsx
    seeker/resume-preview.tsx
    seeker/application-row.tsx
    recruiter/recruiter-shell.tsx
    recruiter/stat-card.tsx
    recruiter/jobs-table.tsx
    recruiter/job-form.tsx
    recruiter/applicant-list.tsx
    recruiter/applicant-detail.tsx
  lib/
    utils.ts                        shadcn cn() + formatters
    types.ts
    match.ts
    use-async.ts                    tiny data-loading hook
    auth/role-context.tsx
    mock/companies.ts
    mock/jobs.ts
    mock/candidates.ts
    mock/applications.ts
    api/_store.ts                   in-memory store + delay/error helpers
    api/candidate-profile.ts
    api/job-posting.ts
    api/job-discovery.ts
    api/resume-preparation.ts
    api/application.ts
    api/index.ts
```

---

### Task 1: Scaffold Next.js, shadcn/ui, theme tokens, providers

**Files:**
- Create: project scaffold in the current directory (keeps existing `docs/`)
- Create/Modify: `src/app/globals.css`, `src/app/layout.tsx`, `src/components/providers.tsx`

**Interfaces:**
- Produces: Tailwind token classes `bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-primary`, `text-primary-foreground`, `bg-primary-soft`, `text-primary-soft-foreground`, `bg-brand-deep`, `text-match-strong`, `bg-match-strong-soft`, `text-match-good`, `bg-match-good-soft`, `text-match-partial`, `bg-match-partial-soft`, `text-info`, `bg-info-soft`, `text-destructive`, `bg-destructive-soft`, `font-sans`; `<Providers>` component.

- [ ] **Step 1: Scaffold into the existing folder**

`create-next-app` refuses a non-empty directory, so scaffold into a temp folder and move it in:

```bash
cd /Users/nif/dev/SoftwareArchitecture/RoleFit
npx create-next-app@latest rolefit-tmp --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --no-turbopack --yes
rsync -a rolefit-tmp/ rolefit-frontend/ && rm -rf rolefit-tmp
cd rolefit-frontend
```

(If the installed version rejects `--no-turbopack`, drop that flag.)

- [ ] **Step 2: Add shadcn/ui and components**

```bash
npx shadcn@latest init -d
npx shadcn@latest add button input label card badge tabs checkbox select slider textarea sheet dropdown-menu avatar separator skeleton sonner radio-group progress table switch tooltip dialog -y
npm i next-themes
```

- [ ] **Step 3: Replace `src/app/globals.css` token block**

Keep the `@import "tailwindcss";` and shadcn `tw-animate-css` import lines that `shadcn init` wrote, then set the tokens to:

```css
@custom-variant dark (&:is(.dark *));

:root {
  --radius: 0.75rem;
  --background: #F6F7FB;
  --foreground: #0F172A;
  --card: #FFFFFF;
  --card-foreground: #0F172A;
  --popover: #FFFFFF;
  --popover-foreground: #0F172A;
  --primary: #4F46E5;
  --primary-foreground: #FFFFFF;
  --primary-soft: #EEF2FF;
  --primary-soft-foreground: #4338CA;
  --secondary: #F1F5F9;
  --secondary-foreground: #0F172A;
  --muted: #F1F5F9;
  --muted-foreground: #64748B;
  --accent: #EEF2FF;
  --accent-foreground: #4338CA;
  --destructive: #B91C1C;
  --destructive-soft: #FEF2F2;
  --border: #E2E8F0;
  --input: #CBD5E1;
  --ring: #4F46E5;
  --brand-deep: #1E1B4B;
  --brand-deep-foreground: #FFFFFF;
  --match-strong: #047857;
  --match-strong-ring: #059669;
  --match-strong-soft: #ECFDF5;
  --match-good: #B45309;
  --match-good-ring: #D97706;
  --match-good-soft: #FFFBEB;
  --match-partial: #475569;
  --match-partial-ring: #64748B;
  --match-partial-soft: #F1F5F9;
  --info: #0369A1;
  --info-soft: #F0F9FF;
}

.dark {
  --background: #0B1020;
  --foreground: #E2E8F0;
  --card: #111827;
  --card-foreground: #E2E8F0;
  --popover: #111827;
  --popover-foreground: #E2E8F0;
  --primary: #818CF8;
  --primary-foreground: #0B1020;
  --primary-soft: #1E1B4B;
  --primary-soft-foreground: #C7D2FE;
  --secondary: #1F2937;
  --secondary-foreground: #E2E8F0;
  --muted: #1F2937;
  --muted-foreground: #94A3B8;
  --accent: #1E1B4B;
  --accent-foreground: #C7D2FE;
  --destructive: #F87171;
  --destructive-soft: #2A1215;
  --border: #1F2937;
  --input: #334155;
  --ring: #818CF8;
  --brand-deep: #1E1B4B;
  --brand-deep-foreground: #FFFFFF;
  --match-strong: #34D399;
  --match-strong-ring: #10B981;
  --match-strong-soft: #052E22;
  --match-good: #FBBF24;
  --match-good-ring: #F59E0B;
  --match-good-soft: #2B1D05;
  --match-partial: #CBD5E1;
  --match-partial-ring: #94A3B8;
  --match-partial-soft: #1F2937;
  --info: #38BDF8;
  --info-soft: #0C2533;
}

@theme inline {
  --font-sans: var(--font-jakarta), ui-sans-serif, system-ui, sans-serif;
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-primary-soft: var(--primary-soft);
  --color-primary-soft-foreground: var(--primary-soft-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-soft: var(--destructive-soft);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-brand-deep: var(--brand-deep);
  --color-brand-deep-foreground: var(--brand-deep-foreground);
  --color-match-strong: var(--match-strong);
  --color-match-strong-ring: var(--match-strong-ring);
  --color-match-strong-soft: var(--match-strong-soft);
  --color-match-good: var(--match-good);
  --color-match-good-ring: var(--match-good-ring);
  --color-match-good-soft: var(--match-good-soft);
  --color-match-partial: var(--match-partial);
  --color-match-partial-ring: var(--match-partial-ring);
  --color-match-partial-soft: var(--match-partial-soft);
  --color-info: var(--info);
  --color-info-soft: var(--info-soft);
}

@layer base {
  * { @apply border-border outline-ring/50; }
  body { @apply bg-background text-foreground antialiased; }
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
  }
}
```

(Remove the shadcn-generated `--chart-*` and `--sidebar-*` tokens only if nothing references them.)

- [ ] **Step 4: Providers and root layout**

`src/components/providers.tsx`:

```tsx
"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { RoleProvider } from "@/lib/auth/role-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      <RoleProvider>
        {children}
        <Toaster richColors position="top-right" />
      </RoleProvider>
    </ThemeProvider>
  );
}
```

`src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap" });

export const metadata: Metadata = {
  title: { default: "RoleFit", template: "%s · RoleFit" },
  description: "Explainable job matching and tailored resumes for job seekers and recruiters.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${jakarta.variable} font-sans`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

`RoleProvider` is created in Task 3; until then, create a stub `src/lib/auth/role-context.tsx` exporting `export function RoleProvider({ children }: { children: React.ReactNode }) { return <>{children}</>; }` so the build passes. Task 3 replaces it.

- [ ] **Step 5: Verify**

Run: `npm run lint && npm run build`
Expected: both succeed.

---

### Task 2: Domain types, match helpers, seed data, mock service layer

**Files:**
- Create: `src/lib/types.ts`, `src/lib/match.ts`, `src/lib/mock/companies.ts`, `src/lib/mock/jobs.ts`, `src/lib/mock/candidates.ts`, `src/lib/mock/applications.ts`, `src/lib/api/_store.ts`, `src/lib/api/candidate-profile.ts`, `src/lib/api/job-posting.ts`, `src/lib/api/job-discovery.ts`, `src/lib/api/resume-preparation.ts`, `src/lib/api/application.ts`, `src/lib/api/index.ts`, `src/lib/use-async.ts`
- Modify: `src/lib/utils.ts` (append formatters)

**Interfaces:**
- Produces: every type in `types.ts`; `matchTier(score)`, `MATCH_TIER_LABEL`; `useAsync(fn, deps)`; `formatDate`, `formatSalary`, `relativeDays`; all API functions listed below with the exact signatures shown. `CURRENT_CANDIDATE_ID = "cand-1"`, `CURRENT_COMPANY_ID = "co-brightline"`.

- [ ] **Step 1: `src/lib/types.ts`**

```ts
export type Role = "seeker" | "recruiter";

export type EmploymentType = "Full-time" | "Part-time" | "Internship" | "Contract";
export type WorkArrangement = "On-site" | "Hybrid" | "Remote";
export type ExperienceLevel = "Internship" | "Entry level" | "Mid level" | "Senior";
export type JobStatus = "Draft" | "Published" | "Closed";
export type ApplicationStatus = "Submitted" | "Under review" | "Interview" | "Offer" | "Rejected";
export type ResumeFormat = "company" | "personal";
export type MatchTier = "strong" | "good" | "partial";

export interface Company {
  id: string;
  name: string;
  initials: string;
  /** Avatar background, a hex color used only for the company logo tile. */
  color: string;
}

export interface Job {
  id: string;
  companyId: string;
  title: string;
  team: string;
  location: string;
  arrangement: WorkArrangement;
  employmentType: EmploymentType;
  experienceLevel: ExperienceLevel;
  salaryMin?: number;
  salaryMax?: number;
  description: string;
  responsibilities: string[];
  requiredSkills: string[];
  requirements: string[];
  preferred: string[];
  deadline?: string;
  postedAt: string;
  status: JobStatus;
  resumeTemplateName?: string;
}

export interface JobWithCompany extends Job {
  company: Company;
}

export type JobInput = Omit<Job, "id" | "companyId" | "postedAt" | "status">;

export interface Experience {
  id: string;
  role: string;
  organization: string;
  start: string;
  end?: string;
  bullets: string[];
}

export interface Project {
  id: string;
  name: string;
  tech: string[];
  bullets: string[];
}

export interface Education {
  id: string;
  degree: string;
  school: string;
  year: string;
}

export interface CandidatePreferences {
  locations: string[];
  arrangements: WorkArrangement[];
  employmentTypes: EmploymentType[];
  minSalary?: number;
}

export interface CandidateProfile {
  id: string;
  name: string;
  initials: string;
  headline: string;
  email: string;
  location: string;
  links: string[];
  summary: string;
  skills: string[];
  experience: Experience[];
  projects: Project[];
  education: Education[];
  preferences: CandidatePreferences;
  verified: boolean;
  completeness: number;
}

export interface ExtractedProfile {
  fileName: string;
  profile: Omit<CandidateProfile, "id" | "verified" | "completeness">;
}

export interface MatchBreakdown {
  skills: number;
  experience: number;
  education: number;
  preferences: number;
}

export interface MatchResult {
  jobId: string;
  candidateId: string;
  score: number;
  breakdown: MatchBreakdown;
  matchedSkills: string[];
  missingSkills: string[];
  strengths: string[];
  gaps: string[];
  explanation: string;
  computedAt: string;
}

export interface JobWithMatch extends JobWithCompany {
  match: MatchResult;
}

export interface ResumeBullet {
  id: string;
  text: string;
  tailored: boolean;
}

export interface ResumeSection {
  id: string;
  kind: "summary" | "experience" | "project" | "skills" | "education";
  title: string;
  meta?: string;
  bullets: ResumeBullet[];
  emphasized: boolean;
  included: boolean;
}

export interface ResumeDraft {
  id: string;
  jobId: string;
  candidateId: string;
  format: ResumeFormat;
  sections: ResumeSection[];
  approved: boolean;
  updatedAt: string;
}

export interface StatusChange {
  status: ApplicationStatus;
  at: string;
  note?: string;
}

export interface MatchSnapshot {
  score: number;
  summary: string;
  capturedAt: string;
}

export interface Application {
  id: string;
  jobId: string;
  candidateId: string;
  resumeDraftId: string;
  resumeFormat: ResumeFormat;
  status: ApplicationStatus;
  submittedAt: string;
  updatedAt: string;
  matchSnapshot: MatchSnapshot;
  history: StatusChange[];
}

export interface ApplicationView extends Application {
  job: JobWithCompany;
  candidate: Pick<CandidateProfile, "id" | "name" | "initials" | "headline" | "email">;
}

export interface JobSearchFilters {
  query?: string;
  location?: string;
  employmentTypes?: EmploymentType[];
  arrangements?: WorkArrangement[];
  experienceLevels?: ExperienceLevel[];
  minSalary?: number;
}
```

- [ ] **Step 2: `src/lib/match.ts`**

```ts
import type { MatchTier } from "./types";

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
```

- [ ] **Step 3: Append formatters to `src/lib/utils.ts`**

```ts
const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

export function formatDate(iso: string): string {
  return dateFmt.format(new Date(iso));
}

export function formatSalary(min?: number, max?: number): string {
  const k = (n: number) => `฿${n.toLocaleString("en-US")}`;
  if (min && max) return `${k(min)} – ${max.toLocaleString("en-US")} / mo`;
  if (min) return `${k(min)}+ / mo`;
  return "Salary not listed";
}

export function relativeDays(iso: string, now: Date = new Date()): string {
  const days = Math.floor((now.getTime() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "1 day ago";
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
}
```

- [ ] **Step 4: Seed data**

`src/lib/mock/companies.ts`:

```ts
import type { Company } from "@/lib/types";

export const companies: Company[] = [
  { id: "co-brightline", name: "Brightline Analytics", initials: "BA", color: "#0F766E" },
  { id: "co-harbor", name: "Harbor Fintech", initials: "HF", color: "#1D4ED8" },
  { id: "co-cobalt", name: "Cobalt Studio", initials: "CS", color: "#7C3AED" },
  { id: "co-meridian", name: "Meridian Health", initials: "MH", color: "#BE123C" },
  { id: "co-atlas", name: "Atlas Logistics", initials: "AL", color: "#B45309" },
  { id: "co-pinecrest", name: "Pinecrest Software", initials: "PS", color: "#0369A1" },
  { id: "co-lotus", name: "Lotus Retail Group", initials: "LR", color: "#15803D" },
];
```

`src/lib/mock/jobs.ts`: 12 jobs. Brightline (the recruiter's company) owns 6, matching the mockup table: Frontend Developer (Published, template "Brightline standard resume"), Backend Engineer (Node.js) (Published, template), Data Analyst (Published), UX Designer (Published, Remote), QA Engineer Intern (Draft), DevOps Engineer (Closed, template). The other 6 are Published jobs from other companies, matching the Find jobs mockup: Junior Web Engineer (Harbor), UI Engineer Intern (Cobalt), Full-stack Developer (Meridian, Chiang Mai), Software Engineer, Platform (Atlas), Mobile Developer (React Native) (Pinecrest, Contract), Web Developer (Lotus). Each has full fields. Use ISO dates relative to 2026-09-24. Example entry to copy for all 12:

```ts
import type { Job } from "@/lib/types";

export const jobs: Job[] = [
  {
    id: "job-frontend",
    companyId: "co-brightline",
    title: "Frontend Developer",
    team: "Data & Insights",
    location: "Bangkok",
    arrangement: "Hybrid",
    employmentType: "Full-time",
    experienceLevel: "Entry level",
    salaryMin: 45000,
    salaryMax: 65000,
    description:
      "You'll build the dashboards our clients use to explore their data. You'll work with designers and backend engineers to ship accessible, fast interfaces in React and TypeScript, and help shape our component library.",
    responsibilities: [
      "Build and maintain customer-facing dashboard features",
      "Turn Figma designs into reusable, accessible components",
      "Write unit and integration tests for UI logic",
      "Take part in code reviews and sprint planning",
    ],
    requiredSkills: ["React", "TypeScript", "Tailwind CSS", "REST APIs", "Git", "GraphQL"],
    requirements: ["1+ year of web development experience", "Bachelor's degree in a related field or equivalent"],
    preferred: ["Data visualization (D3, Recharts)", "Testing with Jest or Vitest", "Accessibility (WCAG)"],
    deadline: "2026-10-15T00:00:00.000Z",
    postedAt: "2026-09-22T09:00:00.000Z",
    status: "Published",
    resumeTemplateName: "Brightline standard resume",
  },
  // …11 more, as described above
];
```

`src/lib/mock/candidates.ts`: `CURRENT_CANDIDATE_ID = "cand-1"` → Pimchanok Srisuk (Frontend Developer, Bangkok; skills React, TypeScript, Next.js, Tailwind CSS, REST APIs, Git, Jest, Figma, JavaScript, CSS, Node.js, PostgreSQL; experience "Frontend Intern · Webcraft Agency" Jun 2025 – May 2026; projects "RoleFit Dashboard" and "Campus Events App"; education B.Eng. Computer Engineering, Chulalongkorn University 2026; preferences Bangkok/Remote, Hybrid/Remote, Full-time/Internship, min 40000; verified true, completeness 92). Plus 6 applicant candidates `cand-2…cand-7` from the Review applicants mockup (Kittipat Wongsa, Sasithorn Chai, Thanawat Boonmee, Napat Rattana, Warisa Petch, Chayut Srisai) with name, initials, headline, email, and a short skills list. Also export:

```ts
export const extractedResumeSample: ExtractedProfile = { fileName: "Pimchanok_Srisuk_Resume.pdf", profile: { /* same data as cand-1 minus id/verified/completeness */ } };
```

`src/lib/mock/applications.ts`: For cand-1: Harbor Junior Web Engineer (Interview), Cobalt UI Engineer Intern (Under review), Lotus Web Developer (Offer), Atlas Software Engineer, Platform (Rejected); each with a `history` that walks the statuses in order. For Brightline Frontend Developer: applications from cand-2…cand-7 with statuses Under review, Interview, Under review, Submitted, Under review, Rejected and snapshots 88, 81, 76, 68, 59, 52 with the summaries from the mockup. Applications for other Brightline jobs: 2–3 each so the counts on the recruiter table are non-zero.

- [ ] **Step 5: `src/lib/api/_store.ts`**

```ts
import { companies } from "@/lib/mock/companies";
import { jobs } from "@/lib/mock/jobs";
import { candidates } from "@/lib/mock/candidates";
import { applications } from "@/lib/mock/applications";
import type { Application, CandidateProfile, Company, Job, ResumeDraft } from "@/lib/types";

export const CURRENT_CANDIDATE_ID = "cand-1";
export const CURRENT_COMPANY_ID = "co-brightline";

interface Store {
  companies: Company[];
  jobs: Job[];
  candidates: CandidateProfile[];
  applications: Application[];
  resumeDrafts: ResumeDraft[];
}

/** In-memory copy of the seed data. Lives for the browser session; reload resets it. */
export const store: Store = structuredClone({ companies, jobs, candidates, applications, resumeDrafts: [] });

export class MockApiError extends Error {}

/** Simulates network latency. Add `?mockError=1` to the URL to make every call fail. */
export async function simulate<T>(produce: () => T, ms = 350): Promise<T> {
  await new Promise((r) => setTimeout(r, ms));
  if (typeof window !== "undefined" && new URLSearchParams(window.location.search).has("mockError")) {
    throw new MockApiError("The service is unavailable. Please try again.");
  }
  return structuredClone(produce());
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function newId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export function withCompany(job: Job) {
  const company = store.companies.find((c) => c.id === job.companyId);
  if (!company) throw new MockApiError(`Unknown company ${job.companyId}`);
  return { ...job, company };
}
```

- [ ] **Step 6: `src/lib/api/candidate-profile.ts`**

```ts
import type { CandidateProfile, ExtractedProfile } from "@/lib/types";
import { extractedResumeSample } from "@/lib/mock/candidates";
import { CURRENT_CANDIDATE_ID, MockApiError, simulate, store } from "./_store";

function find(id: string) {
  const p = store.candidates.find((c) => c.id === id);
  if (!p) throw new MockApiError("Profile not found");
  return p;
}

export function getProfile(candidateId: string = CURRENT_CANDIDATE_ID): Promise<CandidateProfile> {
  return simulate(() => find(candidateId));
}

/** Mock of AI Model Adapter parseResume(): returns sample extracted data for any file. */
export function importResume(file: File): Promise<ExtractedProfile> {
  return simulate(() => ({ ...extractedResumeSample, fileName: file.name }), 1200);
}

export function confirmExtractedProfile(extracted: ExtractedProfile["profile"]): Promise<CandidateProfile> {
  return simulate(() => {
    const p = find(CURRENT_CANDIDATE_ID);
    Object.assign(p, extracted, { verified: true });
    return p;
  });
}

export function updateProfile(patch: Partial<Omit<CandidateProfile, "id">>): Promise<CandidateProfile> {
  return simulate(() => {
    const p = find(CURRENT_CANDIDATE_ID);
    Object.assign(p, patch);
    return p;
  });
}
```

- [ ] **Step 7: `src/lib/api/job-posting.ts`**

```ts
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
```

- [ ] **Step 8: `src/lib/api/job-discovery.ts`**

Deterministic scoring (ADR-003): the service computes the score; the "AI" only writes the explanation text.

```ts
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
```

- [ ] **Step 9: `src/lib/api/resume-preparation.ts`**

```ts
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
```

- [ ] **Step 10: `src/lib/api/application.ts`**

```ts
import type { Application, ApplicationStatus, ApplicationView } from "@/lib/types";
import { computeMatch } from "./job-discovery";
import { CURRENT_CANDIDATE_ID, MockApiError, newId, nowIso, simulate, store, withCompany } from "./_store";

function view(a: Application): ApplicationView {
  const job = store.jobs.find((j) => j.id === a.jobId);
  const c = store.candidates.find((x) => x.id === a.candidateId);
  if (!job || !c) throw new MockApiError("Application data is incomplete");
  return {
    ...a,
    job: withCompany(job),
    candidate: { id: c.id, name: c.name, initials: c.initials, headline: c.headline, email: c.email },
  };
}

/** Mirrors BUC-2C: validate job is open, require approved resume, snapshot the match result. */
export function submitApplication(jobId: string): Promise<ApplicationView> {
  return simulate(() => {
    const job = store.jobs.find((j) => j.id === jobId);
    if (!job || job.status !== "Published") throw new MockApiError("This job is no longer accepting applications");
    const draft = store.resumeDrafts.find((r) => r.jobId === jobId && r.candidateId === CURRENT_CANDIDATE_ID && r.approved);
    if (!draft) throw new MockApiError("Approve your resume before applying");
    if (store.applications.some((a) => a.jobId === jobId && a.candidateId === CURRENT_CANDIDATE_ID)) {
      throw new MockApiError("You've already applied to this job");
    }
    const profile = store.candidates.find((c) => c.id === CURRENT_CANDIDATE_ID)!;
    const match = computeMatch(profile, job);
    const at = nowIso();
    const app: Application = {
      id: newId("app"), jobId, candidateId: CURRENT_CANDIDATE_ID, resumeDraftId: draft.id, resumeFormat: draft.format,
      status: "Submitted", submittedAt: at, updatedAt: at,
      matchSnapshot: { score: match.score, summary: match.explanation, capturedAt: at },
      history: [{ status: "Submitted", at }],
    };
    store.applications.push(app);
    return view(app);
  }, 900);
}

export function getApplication(id: string): Promise<ApplicationView> {
  return simulate(() => {
    const a = store.applications.find((x) => x.id === id);
    if (!a) throw new MockApiError("Application not found");
    return view(a);
  });
}

export function listMyApplications(): Promise<ApplicationView[]> {
  return simulate(() =>
    store.applications
      .filter((a) => a.candidateId === CURRENT_CANDIDATE_ID)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map(view),
  );
}

export function listApplicantsForJob(jobId: string): Promise<ApplicationView[]> {
  return simulate(() =>
    store.applications
      .filter((a) => a.jobId === jobId)
      .sort((a, b) => b.matchSnapshot.score - a.matchSnapshot.score)
      .map(view),
  );
}

/** Also stands in for Notification Adapter sendStatusNotification() — the UI shows a toast. */
export function updateApplicationStatus(id: string, status: ApplicationStatus, note?: string): Promise<ApplicationView> {
  return simulate(() => {
    const a = store.applications.find((x) => x.id === id);
    if (!a) throw new MockApiError("Application not found");
    const at = nowIso();
    a.status = status;
    a.updatedAt = at;
    a.history.push({ status, at, note: note?.trim() || undefined });
    return view(a);
  });
}
```

- [ ] **Step 11: `src/lib/api/index.ts`**

```ts
export * as candidateProfile from "./candidate-profile";
export * as jobPosting from "./job-posting";
export * as jobDiscovery from "./job-discovery";
export * as resumePreparation from "./resume-preparation";
export * as applicationService from "./application";
export { CURRENT_CANDIDATE_ID, CURRENT_COMPANY_ID, MockApiError } from "./_store";
```

Pages call e.g. `jobDiscovery.searchJobs(filters)`.

- [ ] **Step 12: `src/lib/use-async.ts`**

```ts
"use client";

import { useCallback, useEffect, useState } from "react";

export interface AsyncState<T> {
  data: T | undefined;
  error: Error | undefined;
  loading: boolean;
  reload: () => void;
  setData: (data: T) => void;
}

export function useAsync<T>(fn: () => Promise<T>, deps: React.DependencyList): AsyncState<T> {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<Error>();
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(undefined);
    fn()
      .then((d) => alive && setData(d))
      .catch((e: unknown) => alive && setError(e instanceof Error ? e : new Error(String(e))))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, error, loading, reload, setData };
}
```

- [ ] **Step 13: Verify**

Run: `npm run lint && npm run build`
Expected: both succeed (no page uses the API yet; type-checking covers the layer).

---

### Task 3: Mock auth, shared brand components, login and register

**Files:**
- Replace: `src/lib/auth/role-context.tsx`
- Create: `src/components/auth/role-guard.tsx`, `src/components/auth/role-switch.tsx`, `src/components/brand/logo.tsx`, `src/components/brand/company-avatar.tsx`, `src/components/brand/match-ring.tsx`, `src/components/brand/match-badge.tsx`, `src/components/brand/status-badge.tsx`, `src/components/brand/theme-toggle.tsx`, `src/components/brand/page-states.tsx`, `src/app/login/page.tsx`, `src/app/register/page.tsx`

**Interfaces:**
- Consumes: `Role`, `ApplicationStatus`, `JobStatus`, `Company` types; `matchTier`, `MATCH_TIER_LABEL`, `MATCH_TIER_CLASS`.
- Produces:
  - `useRole(): { session: { role: Role; name: string } | null; ready: boolean; signIn(role: Role, name?: string): void; signOut(): void }`
  - `<RoleGuard role="seeker|recruiter">{children}</RoleGuard>`
  - `<RoleSwitch value={role} onChange={(r: Role) => void} />`
  - `<Logo href?: string; inverted?: boolean />`
  - `<CompanyAvatar company={Company} size?: "sm" | "md" | "lg" />`
  - `<MatchRing score={number} size?: "sm" | "md" | "lg" />`
  - `<MatchBadge score={number} />` (tier label pill)
  - `<StatusBadge status={ApplicationStatus | JobStatus} audience?: "seeker" | "recruiter" />` — `Submitted` renders as "New" for recruiters
  - `<ThemeToggle />`
  - `<EmptyState icon title description action? />`, `<ErrorState message onRetry />`, `<ListSkeleton rows? />`

- [ ] **Step 1: `src/lib/auth/role-context.tsx`**

```tsx
"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Role } from "@/lib/types";

interface Session {
  role: Role;
  name: string;
}

interface RoleContextValue {
  session: Session | null;
  ready: boolean;
  signIn: (role: Role, name?: string) => void;
  signOut: () => void;
}

const KEY = "rolefit.session";
const DEFAULT_NAME: Record<Role, string> = { seeker: "Pimchanok Srisuk", recruiter: "Nattapong K." };
const RoleContext = createContext<RoleContextValue | null>(null);

/** Mock-only session stored in localStorage. Not authentication. */
export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setSession(JSON.parse(raw) as Session);
    } catch {
      /* storage unavailable: stay signed out */
    }
    setReady(true);
  }, []);

  const signIn = useCallback((role: Role, name?: string) => {
    const next = { role, name: name?.trim() || DEFAULT_NAME[role] };
    setSession(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {}
  }, []);

  const signOut = useCallback(() => {
    setSession(null);
    try {
      localStorage.removeItem(KEY);
    } catch {}
  }, []);

  const value = useMemo(() => ({ session, ready, signIn, signOut }), [session, ready, signIn, signOut]);
  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole(): RoleContextValue {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used inside RoleProvider");
  return ctx;
}
```

- [ ] **Step 2: `src/components/auth/role-guard.tsx`**

```tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useRole } from "@/lib/auth/role-context";
import type { Role } from "@/lib/types";

export function RoleGuard({ role, children }: { role: Role; children: React.ReactNode }) {
  const { session, ready } = useRole();
  const router = useRouter();
  const allowed = session?.role === role;

  useEffect(() => {
    if (ready && !allowed) router.replace(`/login?role=${role}`);
  }, [ready, allowed, role, router]);

  if (!ready || !allowed) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-muted-foreground" role="status">
        <Loader2 className="mr-2 size-5 animate-spin" aria-hidden /> Loading…
      </div>
    );
  }
  return <>{children}</>;
}
```

- [ ] **Step 3: Brand components**

`logo.tsx`: indigo 32px rounded-lg tile with lucide `Check` (stroke 2.5) + "RoleFit" `text-xl font-extrabold tracking-tight`; `inverted` makes the tile white with primary check and white text; wraps in `next/link` to `href` (default `/`).

`company-avatar.tsx`:

```tsx
import { cn } from "@/lib/utils";
import type { Company } from "@/lib/types";

const SIZE = { sm: "size-10 text-sm rounded-[10px]", md: "size-13 text-base rounded-xl", lg: "size-17 text-xl rounded-2xl" };

export function CompanyAvatar({ company, size = "md", className }: { company: Company; size?: keyof typeof SIZE; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("flex shrink-0 items-center justify-center font-bold text-white", SIZE[size], className)}
      style={{ backgroundColor: company.color }}
    >
      {company.initials}
    </span>
  );
}
```

`match-ring.tsx`:

```tsx
import { cn } from "@/lib/utils";
import { MATCH_TIER_CLASS, MATCH_TIER_LABEL, matchTier } from "@/lib/match";

const DIM = { sm: { box: 56, r: 23, w: 5, text: "text-[15px]" }, md: { box: 72, r: 30, w: 6, text: "text-lg" }, lg: { box: 108, r: 46, w: 9, text: "text-[28px]" } };

export function MatchRing({ score, size = "sm", showLabel = false }: { score: number; size?: keyof typeof DIM; showLabel?: boolean }) {
  const d = DIM[size];
  const c = 2 * Math.PI * d.r;
  const tier = matchTier(score);
  const cls = MATCH_TIER_CLASS[tier];
  return (
    <div className="relative shrink-0" style={{ width: d.box, height: d.box }} role="img" aria-label={`${score}% match, ${MATCH_TIER_LABEL[tier]}`}>
      <svg width={d.box} height={d.box} viewBox={`0 0 ${d.box} ${d.box}`} aria-hidden>
        <circle cx={d.box / 2} cy={d.box / 2} r={d.r} fill="none" strokeWidth={d.w} className={cls.track} />
        <circle
          cx={d.box / 2} cy={d.box / 2} r={d.r} fill="none" strokeWidth={d.w} strokeLinecap="round"
          strokeDasharray={`${(c * score) / 100} ${c}`} transform={`rotate(-90 ${d.box / 2} ${d.box / 2})`}
          className={cn(cls.ring, "transition-[stroke-dasharray] duration-500")}
        />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("font-extrabold leading-none", d.text, cls.text)}>{score}%</span>
        {showLabel && <span className="text-xs font-semibold text-muted-foreground">match</span>}
      </span>
    </div>
  );
}
```

`match-badge.tsx`: pill `rounded-full px-2.5 py-1 text-xs font-bold` with `MATCH_TIER_CLASS[tier].soft` + `.text`, text `MATCH_TIER_LABEL[tier]`.

`status-badge.tsx`:

```tsx
import { cn } from "@/lib/utils";
import type { ApplicationStatus, JobStatus } from "@/lib/types";

const STYLE: Record<ApplicationStatus | JobStatus, string> = {
  Submitted: "bg-primary-soft text-primary-soft-foreground",
  "Under review": "bg-info-soft text-info",
  Interview: "bg-match-good-soft text-match-good",
  Offer: "bg-match-strong-soft text-match-strong",
  Rejected: "bg-destructive-soft text-destructive",
  Published: "bg-match-strong-soft text-match-strong",
  Draft: "bg-muted text-muted-foreground",
  Closed: "bg-destructive-soft text-destructive",
};

export function StatusBadge({ status, audience = "seeker", className }: { status: ApplicationStatus | JobStatus; audience?: "seeker" | "recruiter"; className?: string }) {
  const label = status === "Submitted" && audience === "recruiter" ? "New" : status;
  return <span className={cn("inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold", STYLE[status], className)}>{label}</span>;
}
```

`theme-toggle.tsx`: ghost icon `Button` (`size="icon"`, `className="size-11"`, `aria-label="Toggle dark mode"`) switching `next-themes` `setTheme(resolvedTheme === "dark" ? "light" : "dark")`, showing `Sun`/`Moon`; render nothing until mounted to avoid hydration mismatch.

`page-states.tsx`:

```tsx
import { AlertTriangle, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function EmptyState({ icon: Icon, title, description, action }: { icon: LucideIcon; title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed bg-card px-6 py-14 text-center">
      <span className="flex size-12 items-center justify-center rounded-xl bg-primary-soft text-primary-soft-foreground"><Icon className="size-6" aria-hidden /></span>
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-2xl border bg-card px-6 py-14 text-center">
      <span className="flex size-12 items-center justify-center rounded-xl bg-destructive-soft text-destructive"><AlertTriangle className="size-6" aria-hidden /></span>
      <h3 className="text-lg font-bold">Something went wrong</h3>
      <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
      <Button variant="outline" className="h-11" onClick={onRetry}>Try again</Button>
    </div>
  );
}

export function ListSkeleton({ rows = 4, className = "h-36" }: { rows?: number; className?: string }) {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => <Skeleton key={i} className={`w-full rounded-2xl ${className}`} />)}
    </div>
  );
}
```

- [ ] **Step 4: `src/components/auth/role-switch.tsx`**

Segmented `role="tablist"` control with two `role="tab"` buttons (`User` icon "Job Seeker", `Briefcase` icon "Recruiter"), `aria-selected`, `h-12`, grid 2 columns on `bg-muted p-1.5 rounded-2xl`; selected tab `bg-card text-primary-soft-foreground shadow-sm`.

- [ ] **Step 5: `src/app/login/page.tsx`**

Client page reproducing the "Sign in" artboard: two-column grid (`lg:grid-cols-2`, the left `bg-brand-deep` panel hidden below `lg`). State `role` initialised from `?role=` search param (use `useSearchParams` inside a component wrapped by `<Suspense>`), default `seeker`. Left panel copy and form labels switch by role exactly as in the mockup (`panelTitle`, `panelBody`, three points; "Email" vs "Work email"; button "Sign in as Job Seeker" / "Sign in as Recruiter"). Form fields: email, password (labels visible), "Keep me signed in" checkbox, "Forgot password?" link (`href="#"`). On submit: `event.preventDefault()`, require both fields non-empty (inline error under the field, `aria-invalid`), then `signIn(role)`, `toast.success("Signed in")`, and `router.push(role === "seeker" ? "/seeker/dashboard" : "/recruiter/dashboard")`. Footer link to `/register?role=${role}`. Show a small note: "Demo mode: any email and password will work."

- [ ] **Step 6: `src/app/register/page.tsx`**

Same layout and `RoleSwitch`. Fields: full name, email (or work email), password, and for recruiters an extra "Company name" field. Submit calls `signIn(role, name)` and routes seeker → `/seeker/profile` (to import a resume first), recruiter → `/recruiter/dashboard`. Link back to `/login`.

- [ ] **Step 7: Verify**

Run: `npm run lint && npm run build`, then `npm run dev` and open `/login`: the role switch changes copy and destination; submitting redirects (target pages 404 until later tasks, which is expected).

---

### Task 4: Landing page

**Files:**
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `Logo`, `MatchRing`, `CompanyAvatar`, `Button`.

- [ ] **Step 1: Build the landing page per the "Landing" artboard**

Server component. Sections:
1. Header: `Logo`, nav links (Find jobs → `/login?role=seeker`, How it works → `#how`, For recruiters → `#recruiters`), `ThemeToggle`, "Sign in" ghost link → `/login`, "Get started" primary link → `/register`. Below `md`, the nav links go into a `Sheet` opened by a `Menu` icon button (`aria-label="Open menu"`).
2. Hero (`bg-card border-b`, `lg:grid-cols-2`): pill "Explainable job matching" (`Sparkles`), H1 "Find the roles that actually fit you." (`text-4xl md:text-6xl font-extrabold tracking-tight`), sub-copy from the mockup, search form (keyword + location inputs with visible `sr-only` labels, submit link to `/login?role=seeker`), popular chips. Right column: the sample match card (Brightline Frontend Developer, `MatchRing score={92}`, three "why you fit" rows with green checks, one amber gap row, explanation box, disabled-looking CTA pair) on a `bg-primary-soft rounded-[28px]` backdrop; hidden below `lg`.
3. `#how`: eyebrow + H2 + three step cards (copy from mockup).
4. `#recruiters`: two cards — "For job seekers" (card) and "For recruiters" (`bg-brand-deep text-brand-deep-foreground`) with check lists and CTAs → `/register?role=seeker` and `/register?role=recruiter`.
5. Footer with logo, "Software Architecture Project 2026", Privacy/Terms/Contact `#` links.

- [ ] **Step 2: Verify**

Run: `npm run lint && npm run build`; `npm run dev`, check `/` at 375px and 1440px (no horizontal scroll, menu sheet works).

---

### Task 5: Seeker shell and dashboard

**Files:**
- Create: `src/components/seeker/seeker-shell.tsx`, `src/app/seeker/layout.tsx`, `src/app/seeker/dashboard/page.tsx`, `src/components/seeker/job-card.tsx`

**Interfaces:**
- Consumes: `RoleGuard`, `useRole`, `Logo`, `ThemeToggle`, `jobDiscovery.getRecommendations`, `applicationService.listMyApplications`, `candidateProfile.getProfile`, `useAsync`, `MatchRing`, `MatchBadge`, `CompanyAvatar`, `StatusBadge`.
- Produces: `<JobCard job={JobWithMatch} />` used by Tasks 5–6.

- [ ] **Step 1: `seeker-shell.tsx`**

Client component. Sticky `h-17 bg-card border-b` header with `Logo href="/seeker/dashboard"`, nav items `[{href:"/seeker/dashboard",label:"Dashboard"},{href:"/seeker/jobs",label:"Find jobs"},{href:"/seeker/applications",label:"Applications"},{href:"/seeker/profile",label:"My profile"}]` — active when `pathname.startsWith(href)`: `bg-primary-soft text-primary-soft-foreground` + `aria-current="page"`. Right side: `ThemeToggle`, notifications icon button (`Bell`, `aria-label="Notifications"`), avatar `DropdownMenu` (initials from `session.name`; items: My profile, Sign out → `signOut()` then `router.push("/")`). Below `md`, nav moves into a left `Sheet` behind a `Menu` button. Main content wrapper: `mx-auto w-full max-w-[1440px] px-4 md:px-12 py-6 md:py-8`.

- [ ] **Step 2: `src/app/seeker/layout.tsx`**

```tsx
import { RoleGuard } from "@/components/auth/role-guard";
import { SeekerShell } from "@/components/seeker/seeker-shell";

export default function SeekerLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard role="seeker">
      <SeekerShell>{children}</SeekerShell>
    </RoleGuard>
  );
}
```

- [ ] **Step 3: `job-card.tsx`**

Reproduce the Find jobs card: `article` with `CompanyAvatar`, title `Link` → `/seeker/jobs/${job.id}` (`text-lg font-bold`), company name, meta row (`MapPin` location · arrangement, `Briefcase` employment type, salary via `formatSalary` in `font-semibold text-foreground`, `Clock` `relativeDays(postedAt)`), skill chips: each `job.requiredSkills` item green (`bg-match-strong-soft text-match-strong`) if in `job.match.matchedSkills`, otherwise `bg-muted text-muted-foreground`, with an `sr-only` "(you have this)" / "(missing)" suffix. Right column: `MatchRing score`, `MatchBadge`, save icon button (`Bookmark`, `aria-label="Save job"`, toggles filled state locally + `toast`), "View" link. Below `sm` the right column becomes a row under the content.

- [ ] **Step 4: Dashboard page**

Client page. Content:
- Greeting "Good to see you, {firstName}" + sub "Here's what's new for you today."
- Three `StatCard`-like tiles (inline `Card`s): Profile completeness (`Progress` value from profile, link "Improve profile" → `/seeker/profile`), Active applications (count of non-Rejected, non-Offer), Offers (count).
- "Recommended for you" section: `getRecommendations(3)` rendered with `JobCard`, "See all" → `/seeker/jobs`.
- "Recent applications" list: top 3 from `listMyApplications()` with `CompanyAvatar`, title, `StatusBadge`, link → `/seeker/applications`.
- Each async block handles `loading` (`ListSkeleton`), `error` (`ErrorState` with `reload`), empty (`EmptyState`).

- [ ] **Step 5: Verify**

`npm run lint && npm run build`; in dev, sign in as job seeker → dashboard renders; sign in as recruiter then visit `/seeker/dashboard` → redirected to `/login?role=seeker`.

---

### Task 6: Find jobs (search + filters)

**Files:**
- Create: `src/components/seeker/job-filters.tsx`, `src/app/seeker/jobs/page.tsx`

**Interfaces:**
- Consumes: `JobSearchFilters`, `jobDiscovery.searchJobs`, `jobDiscovery.getRecommendations`, `JobCard`.
- Produces: `<JobFilters value={JobSearchFilters} onChange={(f: JobSearchFilters) => void} onClear={() => void} />`

- [ ] **Step 1: `job-filters.tsx`**

Card with "Filters" heading + "Clear all" button. Three `fieldset`s with `legend` (Employment type, Work arrangement, Experience level) of shadcn `Checkbox` + `Label` for every enum value; a "Minimum salary" `Slider` (0–120000 step 5000) showing `฿{value}+ / mo`. Emits a new filters object on every change.

- [ ] **Step 2: Jobs page**

Client page reproducing the Find jobs artboard:
- Header card: H1 "Find jobs", sub "Match scores come from your verified profile.", verified pill (`CheckCircle2`, "Profile verified · {completeness}% complete").
- Search form: keyword + location inputs; submit updates `query`/`location` in filters state (and the URL `?q=&loc=` via `router.replace`, read back with `useSearchParams` in a `Suspense` boundary so links from landing/dashboard work).
- Layout `lg:flex gap-7`: `JobFilters` aside (`w-72`; below `lg`, a "Filters" button opens it in a bottom `Sheet`).
- Tabs (`Tabs`): "Recommended for you" (calls `getRecommendations(20)` then applies the same filters client-side by calling `searchJobs(filters)` and keeping jobs with `match.score >= 60`) and "All jobs" (`searchJobs(filters)`). Sort `Select`: Best match (score desc), Most recent (`postedAt` desc), Salary (`salaryMax ?? salaryMin` desc).
- Result count "{n} jobs"; list of `JobCard`; loading → `ListSkeleton rows={4}`; error → `ErrorState`; empty → `EmptyState icon={SearchX} title="No jobs match these filters" description="Try removing a filter or searching a broader keyword." action={<Button onClick={clear}>Clear filters</Button>}`.

- [ ] **Step 3: Verify**

`npm run lint && npm run build`; in dev: typing "react" + Search narrows results; ticking Remote shows only remote jobs; clearing restores; `/seeker/jobs?mockError=1` shows the error state.

---

### Task 7: Job detail with match panel

**Files:**
- Create: `src/components/seeker/match-panel.tsx`, `src/app/seeker/jobs/[id]/page.tsx`

**Interfaces:**
- Consumes: `jobDiscovery.evaluateJobFit(jobId): Promise<JobWithMatch>`, `applicationService.listMyApplications`.
- Produces: `<MatchPanel match={MatchResult} />`

- [ ] **Step 1: `match-panel.tsx`**

Per the "Job detail & match" artboard right column:
- Card 1: `MatchRing size="lg" showLabel`, `MatchBadge`, headline "You meet {matched} of {required} required skills"; breakdown rows for Skills / Experience / Education / Preferences with `Progress` (bar color by tier via `[&>div]:bg-match-*-ring` classes) and `%` value; "Your strengths" list (green check circles); "Gaps to consider" list (amber `Minus` circles).
- Card 2: "Why this match" with `Sparkles`, `match.explanation`, and the footnote "The score is calculated from your verified profile. AI only writes this explanation. Use it to help you decide; it is not a hiring decision."

- [ ] **Step 2: Detail page**

Client page, `const { id } = useParams<{ id: string }>()`. Load `evaluateJobFit(id)` and `listMyApplications()` (to know if already applied). Layout: breadcrumb (Find jobs / title); `lg:flex` main + `aside w-[440px]` (stacks under main below `lg`).
Main: header card (`CompanyAvatar size="lg"`, H1 title, "{company} · {team} team", save button), four fact tiles (Location · arrangement, Employment, Experience, Salary), actions: if already applied → `StatusBadge` + "View application" link to `/seeker/applications`; else primary link "Tailor resume & apply" (`Sparkles`) → `/seeker/jobs/${id}/resume`; template note when `resumeTemplateName`; deadline text "Apply by {formatDate(deadline)}" in `text-match-good`. Second card: About the role, Responsibilities list, Requirements grid (Required = `requiredSkills` + `requirements`, Preferred = `preferred`).
Loading: skeletons sized like the two columns; evaluateJobFit takes ~800ms, so show "Calculating your match…" text in the aside skeleton. Error: `ErrorState`.

- [ ] **Step 3: Verify**

`npm run lint && npm run build`; open a job from `/seeker/jobs`; the score and chips on the card match the detail panel.

---

### Task 8: Tailor resume, approve and submit

**Files:**
- Create: `src/components/seeker/resume-preview.tsx`, `src/app/seeker/jobs/[id]/resume/page.tsx`

**Interfaces:**
- Consumes: `resumePreparation.getResumeDraft`, `generateTailoredResume`, `editResumeDraft`, `selectResumeFormat`, `approveResume`; `applicationService.submitApplication`; `jobPosting.getJob`; `candidateProfile.getProfile`.
- Produces: `<ResumePreview draft={ResumeDraft} profile={CandidateProfile} companyName?: string; companyColor?: string; onEditBullet(sectionId: string, bulletId: string, text: string): void />`

- [ ] **Step 1: `resume-preview.tsx`**

Paper-style `article` (`bg-white text-slate-900` in both themes, `shadow-lg rounded-md px-14 py-12`). Header: when `draft.format === "company"`, a full-bleed band in `companyColor` with white name; otherwise name with a 2px bottom rule and primary-colored section titles. Contact line from `profile.email` and `profile.links`. Render only `included` sections in order; bullets with `tailored` get `bg-primary-soft rounded px-1.5` highlight. Each bullet is click-to-edit: clicking swaps it for a `Textarea` (autofocus); blur or Enter (without Shift) calls `onEditBullet`; Escape cancels. Bullets are `button`-accessible (`role="button"`, `tabIndex={0}`, Enter opens edit, `aria-label="Edit line"`).

- [ ] **Step 2: Resume page**

Client page. Header replaces the shell's page header: back link to `/seeker/jobs/${id}`, 3-step stepper (Generate ✓ when a draft exists, Review & edit current, Submit), rendered as an `ol` with `aria-current="step"`.
Flow:
1. On load: `getJob(id)`, `getProfile()`, `getResumeDraft(id)`. If no draft, show a generate card: "Create a resume tailored for {title}" + "Generate tailored resume" button → `generateTailoredResume(id)` with a progress state ("Selecting relevant experience…", `Loader2`, ~1.5s).
2. With a draft: left column (`w-[460px]`, stacks below `lg`): job mini card with `MatchBadge` (score from `getMatchResult(id)`); "Resume format" `RadioGroup` of two cards — "{company} company template" (only if `job.resumeTemplateName`, hint "Provided by the recruiter for this job") and "My default format" (hint "Your personal layout from your profile"); when there is no template, show only the default option with the note "This job has no company template, so your default format is used." (FR-12). Changing calls `selectResumeFormat`. "What we emphasized" list: a `Checkbox` per section toggling `included` (calls `editResumeDraft`) with an "Emphasized"/"Kept" tag, plus "Regenerate" button (confirm via `window.confirm("Regenerate? Your edits will be replaced.")`). Integrity note box (`ShieldCheck`): "Built only from your verified profile. AI can reorder and rephrase your content, but it cannot add skills, jobs or achievements."
3. Right column: "Preview" heading + "Highlighted lines were tailored for this job. Click any line to edit it.", buttons "Save draft" (toast "Draft saved") and primary "Approve & submit application". The primary opens a confirm shadcn `Dialog`: title "Submit your application?", body "We'll send this resume to {company} for {title}. You can't edit it after submitting.", checkbox "I've reviewed this resume and it's accurate" (required), Submit button → `approveResume(id)` then `submitApplication(id)`; on success `toast.success("Application sent to {company}")` and `router.push("/seeker/applications?submitted=" + application.id)`; on `MockApiError` show the message inside the dialog.

- [ ] **Step 3: Verify**

`npm run lint && npm run build`; in dev: generate → switch format (preview header changes) → edit a line → untick a section (it disappears) → approve & submit → lands on applications. Submitting again for the same job shows "You've already applied to this job".

---

### Task 9: My applications

**Files:**
- Create: `src/components/seeker/application-row.tsx`, `src/app/seeker/applications/page.tsx`

**Interfaces:**
- Consumes: `applicationService.listMyApplications`, `StatusBadge`, `CompanyAvatar`.
- Produces: `<ApplicationRow application={ApplicationView} />`

- [ ] **Step 1: `application-row.tsx`**

Per the "My applications" artboard: `CompanyAvatar`, title + "{company} · Applied {formatDate(submittedAt)}", progress `ol aria-label="Progress"` with 4 steps (Submitted, Under review, Interview, Offer): step `i` is done when `i <= reachedIndex`, where `reachedIndex` is the index of the status (Rejected → index of the last non-rejected status in `history`); done bars `bg-primary` (or `bg-destructive/40` when Rejected), pending `bg-border`, current label bold. Right: `StatusBadge` + "Updated {relativeDays(updatedAt)}". Clicking the chevron expands (`Collapsible`-style local state) a history list: each `StatusChange` with date and optional recruiter note. Below `md`, the progress row wraps under the title.

- [ ] **Step 2: Page**

H1 "My applications" + sub. If `?submitted=<id>` is present, a green `role="status"` banner "Application sent to {company}. We'll notify you when the recruiter updates your status." Tabs with counts: All, Active (Submitted/Under review/Interview), Offers, Closed (Rejected). List of `ApplicationRow`; empty → `EmptyState icon={FileText} title="No applications yet" description="Find a job that fits and apply with a tailored resume." action={<Link href="/seeker/jobs">Find jobs</Link>}`.

- [ ] **Step 3: Verify**

`npm run lint && npm run build`; tabs filter correctly; the application submitted in Task 8 appears first with status Submitted.

---

### Task 10: Profile — import resume, review, edit

**Files:**
- Create: `src/app/seeker/profile/page.tsx`, `src/components/seeker/profile-sections.tsx`

**Interfaces:**
- Consumes: `candidateProfile.getProfile`, `importResume`, `confirmExtractedProfile`, `updateProfile`.
- Produces: `<ProfileSections profile={CandidateProfile} editable onChange={(p: CandidateProfile) => void} />`

- [ ] **Step 1: `profile-sections.tsx`**

Cards for Basics (name, headline, location, email, links), Summary (`Textarea`), Skills (chips with remove `X` buttons + input to add on Enter), Experience (each entry: role, organization, start/end month inputs, bullets textarea one-per-line), Projects (name, tech comma list, bullets), Education (degree, school, year), Preferences (checkbox groups for arrangements and employment types, locations comma list, min salary number). In read mode, render as text; in edit mode, as labeled inputs. Add/remove buttons for list entries.

- [ ] **Step 2: Profile page**

States:
1. **View** (default): header with name, headline, verified badge, `Progress` completeness, buttons "Import from resume" and "Edit profile"; `ProfileSections` read-only.
2. **Import**: dropzone card (`input type="file" accept=".pdf,.doc,.docx"` visually wrapped by a label, drag-over styling, `Upload` icon, "PDF or Word, up to 5 MB"); on file choose → `importResume(file)` with progress text "Reading your resume…".
3. **Review extracted data**: info banner "We extracted this from {fileName}. Check every detail — only confirmed information is used for matching and resumes." + `ProfileSections editable` bound to the extracted data + "Confirm and save" (→ `confirmExtractedProfile`, toast, back to View) and "Cancel".
4. **Edit**: `ProfileSections editable` on a copy; "Save changes" → `updateProfile`, toast; "Cancel".

- [ ] **Step 3: Verify**

`npm run lint && npm run build`; import any local PDF → review → confirm → view shows data; edit a skill → save → persists across navigation (until reload).

---

### Task 11: Recruiter shell, dashboard and job postings table

**Files:**
- Create: `src/components/recruiter/recruiter-shell.tsx`, `src/app/recruiter/layout.tsx`, `src/components/recruiter/stat-card.tsx`, `src/components/recruiter/jobs-table.tsx`, `src/app/recruiter/dashboard/page.tsx`, `src/app/recruiter/jobs/page.tsx`

**Interfaces:**
- Consumes: `jobPosting.listJobs({ companyId: CURRENT_COMPANY_ID })`, `publishJob`, `closeJob`, `reopenJob`, `applicationService.listApplicantsForJob`, `StatusBadge`.
- Produces: `<StatCard label value note? />`, `<JobsTable rows={JobRow[]} onAction(job: JobWithCompany): void />` where `interface JobRow { job: JobWithCompany; applicants: number; newApplicants: number; interviews: number; avgMatch: number | null }`; `loadJobRows(): Promise<JobRow[]>`.

- [ ] **Step 1: `recruiter-shell.tsx` and layout**

Per the recruiter artboards: fixed `w-65` left sidebar (`bg-card border-r`): `Logo` + "RECRUITER" tag (`bg-brand-deep text-brand-deep-foreground text-[11px] font-bold`), company workspace card (Brightline `CompanyAvatar size="sm"`, "Company workspace"), nav `[Dashboard /recruiter/dashboard (LayoutDashboard), Job postings /recruiter/jobs (Briefcase), Company profile # (Building2)]` with active styling + `aria-current`; bottom user block with initials, name, "Talent acquisition", and a `DropdownMenu` (Toggle theme, Sign out). Below `lg` the sidebar is hidden and a top bar with a `Menu` button opens it in a left `Sheet`. Content: `flex-1 px-4 md:px-10 py-6 md:py-8`. `src/app/recruiter/layout.tsx` wraps with `RoleGuard role="recruiter"` like the seeker layout.

- [ ] **Step 2: Data helper**

Export from `src/components/recruiter/jobs-table.tsx` (used by both the jobs page and the dashboard):

```ts
export async function loadJobRows(): Promise<JobRow[]> {
  const jobs = await jobPosting.listJobs({ companyId: CURRENT_COMPANY_ID });
  return Promise.all(
    jobs.map(async (job) => {
      const apps = await applicationService.listApplicantsForJob(job.id);
      return {
        job,
        applicants: apps.length,
        newApplicants: apps.filter((a) => a.status === "Submitted").length,
        interviews: apps.filter((a) => a.status === "Interview").length,
        avgMatch: apps.length ? Math.round(apps.reduce((s, a) => s + a.matchSnapshot.score, 0) / apps.length) : null,
      };
    }),
  );
}
```

- [ ] **Step 3: `jobs-table.tsx`**

shadcn `Table` with columns Job (title link → `/recruiter/jobs/${id}/applicants` + "{team} · {location} · {arrangement}"), Status (`StatusBadge`), Applicants (count + "+{n} new" in `text-primary-soft-foreground`), Avg. match, Template ("Attached"/"None"), Deadline, Actions: primary action button by status (Draft → "Publish", Published → "Close", Closed → "Reopen") calling `onAction(job)`, plus a `DropdownMenu` (`MoreHorizontal`, `aria-label="More actions"`) with "Edit" → `/recruiter/jobs/${id}/edit` and "View applicants". Wrap the table in `overflow-x-auto` for small screens.

- [ ] **Step 4: Jobs page**

H1 "Job postings" + sub + "Create job" button → `/recruiter/jobs/new`. Four `StatCard`s summed from rows: Open postings (Published count), Total applicants, New (sum of `newApplicants`), In interview (sum of `interviews`). Card with status `Tabs` (All/Published/Draft/Closed with counts) + search input filtering by title, then `JobsTable`. `onAction`: Draft → `publishJob`; Published → confirm dialog "Close this posting? Candidates can no longer apply." → `closeJob`; Closed → `reopenJob`; toast each result and reload.

- [ ] **Step 5: Dashboard page**

Greeting, the same four `StatCard`s, "Recent applicants" (latest 5 applications across company jobs sorted by `submittedAt`, each row avatar initials + name + job title + `MatchBadge` + `StatusBadge audience="recruiter"`, link to that job's applicants page with `?app=<id>`), and "Postings closing soon" (published jobs with deadline within 21 days).

- [ ] **Step 6: Verify**

`npm run lint && npm run build`; sign in as recruiter; publish the Draft, close and reopen a job — status badges and tab counts update.

---

### Task 12: Job form (create and edit)

**Files:**
- Create: `src/components/recruiter/job-form.tsx`, `src/app/recruiter/jobs/new/page.tsx`, `src/app/recruiter/jobs/[id]/edit/page.tsx`

**Interfaces:**
- Consumes: `JobInput`, `jobPosting.createJob`, `updateJob`, `getJob`, `publishJob`, `attachResumeTemplate`.
- Produces: `<JobForm initial?: JobInput; submitLabel: string; onSubmit(input: JobInput, opts: { publish: boolean; template?: File }): Promise<void> />`

- [ ] **Step 1: `job-form.tsx`**

Sections as cards (FR-05, FR-06): Basics (title*, team, location*, work arrangement `Select`*, employment type `Select`*, experience level `Select`*), Compensation (salary min/max number inputs, optional), Description (`Textarea`*), Responsibilities (one per line `Textarea`), Required skills (chip input like the profile skills), Requirements and Preferred qualifications (one per line), Application (deadline `input type="date"`), Resume template (optional file input `.pdf,.docx`, shows current `resumeTemplateName` with a remove button; helper "Candidates can choose this template or their own format."). Validation on submit: required fields non-empty, `salaryMax >= salaryMin` when both set, at least one required skill; errors rendered under each field with `aria-invalid` and focus moved to the first invalid field. Sticky footer bar with "Save as draft" (secondary) and `submitLabel` primary ("Publish job"), both disabled while submitting.

- [ ] **Step 2: New page**

Breadcrumb Job postings / New job; H1 "Create a job posting". `onSubmit`: `createJob(input)`, then `attachResumeTemplate(job.id, template)` if a file was chosen, then `publishJob` when `publish`; toast "Job published" / "Draft saved"; `router.push("/recruiter/jobs")`.

- [ ] **Step 3: Edit page**

`useParams` id → `getJob(id)` (loading/error states), map the job to `JobInput` as `initial`, H1 "Edit {title}", `submitLabel` "Save and publish" when Draft or "Save changes" otherwise; `onSubmit` → `updateJob`, optional template, optional publish; toast; back to list.

- [ ] **Step 4: Verify**

`npm run lint && npm run build`; create a job with a missing title → inline error; create a valid one → appears in table as Published with template "Attached"; edit it → changes persist.

---

### Task 13: Review applicants

**Files:**
- Create: `src/components/recruiter/applicant-list.tsx`, `src/components/recruiter/applicant-detail.tsx`, `src/app/recruiter/jobs/[id]/applicants/page.tsx`

**Interfaces:**
- Consumes: `jobPosting.getJob`, `applicationService.listApplicantsForJob`, `updateApplicationStatus`, `StatusBadge`, `MatchBadge`.
- Produces: `<ApplicantList applications={ApplicationView[]} selectedId onSelect(id: string) />`, `<ApplicantDetail application={ApplicationView} onUpdated(a: ApplicationView) />`

- [ ] **Step 1: `applicant-list.tsx`**

Per the "Review applicants" artboard: status filter chips (All, New, Under review, Interview, Offer, Rejected with counts; "New" = Submitted); rows are `button`s with `aria-pressed`, avatar initials, name, headline, snapshot score colored by tier (`MATCH_TIER_CLASS`), `StatusBadge audience="recruiter"`; selected row `bg-primary-soft` with a 3px inset left shadow in primary.

- [ ] **Step 2: `applicant-detail.tsx`**

Card: large initials avatar, name, headline, "Applied {formatDate}", email link. "Match snapshot" block: score, `Progress`, `matchSnapshot.summary`, "Captured when the candidate applied ({formatDate(capturedAt)}). Decision support only." "Submitted resume" row (`FileText`, "{Company template | Personal format} · approved by candidate", "Open" button showing a toast "Resume viewer is not connected yet"). "Update status" `RadioGroup` rendered as 2×2 option buttons (Under review, Interview, Offer, Rejected) preselected with current status; "Message to candidate (optional)" `Textarea`; "Update status & notify candidate" button (disabled when the chosen status equals the current one) → `updateApplicationStatus(id, status, note)` → `toast.success("Status updated. {firstName} has been notified.")` → `onUpdated`. Status history list at the bottom.

- [ ] **Step 3: Page**

`useParams` id; load job + applicants; breadcrumb Job postings / {title}; H1 "Applicants" + `StatusBadge` of the job + "{n} applicants · deadline {date}". Layout `xl:flex gap-5`: list + detail `w-[440px]`; below `xl`, selecting a row opens the detail in a right `Sheet`. Initial selection = `?app=` param if present, else the first applicant. `onUpdated` replaces that item in local state. Empty → `EmptyState icon={Users} title="No applicants yet" description="Applications will appear here as candidates apply."`.

- [ ] **Step 4: Verify**

`npm run lint && npm run build`; update an applicant to Interview → badge and filter counts update; the change survives navigating to Job postings and back.

---

### Task 14: Final pass

**Files:**
- Modify: any files flagged by the checks below; `README.md`

- [ ] **Step 1: README**

Replace the create-next-app README with: what the template is, `npm install` / `npm run dev`, demo sign-in (any email/password; choose Job Seeker or Recruiter), route list, the mock API layer and how to swap each `src/lib/api/*.ts` function for a real `fetch` to its service, and `?mockError=1`.

- [ ] **Step 2: Static checks**

Run: `npm run lint && npm run build`
Expected: no errors, no warnings about missing `Suspense` for `useSearchParams`.

- [ ] **Step 3: Manual browser pass**

With `npm run dev`, walk through at 1440px and 375px: landing → register as seeker → profile import → find jobs → job detail → tailor → submit → applications; sign out → sign in as recruiter → dashboard → jobs (publish/close/reopen) → create job → applicants (update status). Toggle dark mode on each page and check contrast and focus rings. Confirm no horizontal scroll at 375px.

- [ ] **Step 4: Report**

List anything not done or behaving differently from the spec. Do not commit.
