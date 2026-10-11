# RoleFit Frontend

Next.js web app for RoleFit (Job Seeker and Recruiter). The browser talks to **one** backend, the
[API Gateway](../rolefit-api-gateway) (`:8080`), with the signed-in user's Supabase access token
(`Authorization: Bearer …`). The gateway routes each request to a service:

| Gateway path | Service |
| --- | --- |
| `/api/candidates/*` | Candidate Profile Service (REST) |
| `/api/discovery/*` | Job Discovery Service (REST: search, recommendations, job fit) |
| `/api/jobs/*` | Job Posting Service (the gateway translates to gRPC) |

All calls go through `src/lib/api/gateway.ts`. Resume Preparation and Application are still browser-side
mocks, but they read the real jobs and profile (and Application snapshots the match from Job Discovery).

## Environment (`.env.local`)

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
NEXT_PUBLIC_API_GATEWAY_URL=http://localhost:8080
```

`NEXT_PUBLIC_*` values are built into the browser bundle: restart `npm run dev` (or rebuild) after changing them.

## Supabase setup (Auth project)

Run in the Supabase SQL Editor:

1. `supabase/auth-setup.sql` — role + recruiter company trigger and the `company_name_taken` check (safe to re-run).
2. `supabase/backfill-company-ids.sql` — once, to give recruiters registered before company ids a company. They must sign in again afterwards.

Each recruiter account gets its own company (`co-<name>-<6 hex>`, e.g. `co-acme-corp-7f3a9c`); company names are unique.

Jobs created while the gateway still used the mock company (co-brightline) stay under that demo company and can no longer be edited by any recruiter; reseed or delete them in a dev database. The seeded Brightline jobs remain visible to seekers as demo data.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js |
| `npm test` | Unit tests (vitest): mappers, API clients, form validation |
| `npm run lint` | ESLint |
| `npx tsx scripts/e2e-smoke.ts` | End-to-end smoke test through the running API Gateway and services. Needs `SMOKE_SEEKER_EMAIL`, `SMOKE_SEEKER_PASSWORD`, `SMOKE_RECRUITER_EMAIL`, `SMOKE_RECRUITER_PASSWORD` (existing Supabase accounts; the recruiter must have a company id — see Supabase setup); deletes the seeker's profile and leaves one closed test job |
