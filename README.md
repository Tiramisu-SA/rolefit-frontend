# RoleFit Frontend

Next.js web app for RoleFit (Job Seeker and Recruiter). It talks to two backend services:

| Service | Protocol | Called from |
| --- | --- | --- |
| Candidate Profile Service | REST/JSON (`:3001`) | the browser |
| Job Posting Service | gRPC (`:50052`) | the Next.js server, through Server Actions (`src/lib/api/job-posting-actions.ts`) |

Job Discovery, Resume Preparation and Application are still browser-side mocks, but they read the real jobs and profile.
Design: [docs/superpowers/specs/2026-09-27-backend-integration-design.md](docs/superpowers/specs/2026-09-27-backend-integration-design.md).

## Environment (`.env.local`)

```env
NEXT_PUBLIC_CANDIDATE_PROFILE_API_URL=http://localhost:3001
NEXT_PUBLIC_DEV_SEEKER_USER_ID=<any UUID>       # mock seeker identity (sent as X-User-Id)
JOB_POSTING_GRPC_URL=localhost:50052            # server only
DEV_RECRUITER_USER_ID=user_4a80fdb2             # server only, mock recruiter identity
DEV_RECRUITER_COMPANY_ID=co-brightline          # server only; matches the seeded jobs
```

`NEXT_PUBLIC_*` values are built into the browser bundle: restart `npm run dev` (or rebuild) after changing them.
Auth is mocked; the role switch on the login page only picks which area you see.

## Run everything locally

1. **Candidate Profile Service** (`../rolefit-candidate-profile-service`): apply `db/migrations/003_match_er_diagram.sql` once in the Supabase SQL Editor, set `CORS_ORIGIN=http://localhost:3000`, then `npm run dev`.
2. **Job Posting Service** (`../rolefit-job-posting-service`): needs MongoDB (e.g. `docker run -d -p 27017:27017 mongo:7`). Set `HTTP_PORT=3002`, `GRPC_PORT=50052`, `MONGODB_URI`, then `npm run seed` (12 sample jobs) and `npm run dev`.
3. **Frontend**: `npm install`, then `npm run dev` and open http://localhost:3000.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js |
| `npm test` | Unit tests (vitest): mappers, API clients, match scoring, form validation |
| `npm run lint` | ESLint |
| `npx tsx --conditions=react-server scripts/e2e-smoke.ts` | End-to-end smoke test against the two running services (uses a fresh seeker id; leaves one closed test job) |
