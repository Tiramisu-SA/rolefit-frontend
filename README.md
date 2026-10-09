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

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js |
| `npm test` | Unit tests (vitest): mappers, API clients, form validation |
| `npm run lint` | ESLint |
| `npx tsx scripts/e2e-smoke.ts` | End-to-end smoke test through the running API Gateway and services. Needs `SMOKE_SEEKER_EMAIL`, `SMOKE_SEEKER_PASSWORD`, `SMOKE_RECRUITER_EMAIL`, `SMOKE_RECRUITER_PASSWORD` (existing Supabase accounts), optional `SMOKE_COMPANY_ID` (default `co-brightline`; must equal the gateway's `DEV_RECRUITER_COMPANY_ID`); deletes the seeker's profile and leaves one closed test job |
