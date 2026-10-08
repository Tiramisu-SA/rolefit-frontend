# RoleFit Frontend

Next.js web app for RoleFit (Job Seeker and Recruiter). It talks to three backend services:

| Service | Protocol | Called from |
| --- | --- | --- |
| Candidate Profile Service | REST/JSON (`:3001`) | the browser |
| Job Posting Service | gRPC (`:50052`) | the Next.js server, through Server Actions (`src/lib/api/job-posting-actions.ts`) |
| Job Discovery Service | REST/JSON (`:3002`) | the browser (search, recommendations, job fit; it reads profiles and jobs from the two services above over gRPC) |

Resume Preparation and Application are still browser-side mocks, but they read the real jobs and profile (and Application snapshots the match from Job Discovery).
Design: [docs/superpowers/specs/2026-09-27-backend-integration-design.md](docs/superpowers/specs/2026-09-27-backend-integration-design.md).

## Environment (`.env.local`)

```env
NEXT_PUBLIC_CANDIDATE_PROFILE_API_URL=http://localhost:3001
NEXT_PUBLIC_JOB_DISCOVERY_API_URL=http://localhost:3002
NEXT_PUBLIC_DEV_SEEKER_USER_ID=<any UUID>       # mock seeker identity (sent as X-User-Id)
JOB_POSTING_GRPC_URL=localhost:50052            # server only
DEV_RECRUITER_USER_ID=user_4a80fdb2             # server only, mock recruiter identity
DEV_RECRUITER_COMPANY_ID=co-brightline          # server only; matches the seeded jobs
```

`NEXT_PUBLIC_*` values are built into the browser bundle: restart `npm run dev` (or rebuild) after changing them.
Auth is mocked; the role switch on the login page only picks which area you see.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js |
| `npm test` | Unit tests (vitest): mappers, API clients, form validation |
| `npm run lint` | ESLint |
| `npx tsx --conditions=react-server scripts/e2e-smoke.ts` | End-to-end smoke test against the three running services (uses a fresh seeker id; leaves one closed test job) |
