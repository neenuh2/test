# Training Program Monitoring System

Centralized monitoring for the **BPI Consumer Bank — Manpower Transformation & Training Team**:
attendance, deliverable completion & due dates, automated reminder emails, participant
feedback, and a filterable dashboard.

Built to the specification in [`spec.md`](./spec.md).

## Tech stack

- **Next.js (App Router) + TypeScript** — single codebase for UI and API
- **PostgreSQL + Prisma** — typed schema & migrations
- **Auth.js (NextAuth v5)** — Credentials provider now; OIDC/SAML seam for BPI SSO later
- **Tailwind CSS + shadcn/ui** — UI
- **Recharts** — charts (Phase 6)
- **Nodemailer (SMTP)** — email (Phase 4)
- **node-cron** — daily due-date scan (Phase 4)
- **Zod** — validation · **Vitest + Playwright** — tests
- **Docker + docker-compose** — packaging (app + postgres + mailhog)

## Build phases

The system is built in the phases described in `spec.md §10`. Current status:

- [x] **Phase 0 — Scaffold**: Next.js + TS + Tailwind + shadcn, Prisma + Postgres via
      docker-compose, Auth.js credentials, `.env.example`, README, login page + empty
      protected dashboard shell.
- [x] **Phase 1 — Data model + admin CRUD**: full §5 Prisma schema + migration; CRUD for
      programs, modules (per-cohort scoping + reorder), deliverables (with per-run due
      dates), program runs, sessions, participants, and enrollments; the 5 cohorts and a
      demo dataset (2 programs, ~30 participants, runs/sessions dated around today).
- [x] **Phase 2 — Attendance**: keyboard-friendly per-session attendance grid (save all at
      once), per-session/per-run/per-cohort/per-module rollups, per-participant timeline +
      modules-missed + attendance rate, and run-scoped CSV import with a pre-filled template
      and a dry-run preview (create/update/reject) before commit.
- [x] **Phase 3 — Deliverables & completion**: submission grid (status/remarks/file link) with
      auto LATE flagging and OVERDUE display; configurable completion rule (attendance
      threshold + all applicable required deliverables) recomputed on attendance/submission
      changes; run deliverables overview with status breakdown, resolved due dates,
      completion % by cohort, and per-participant completion; Settings page for the threshold.
- [ ] Phase 4 — Due-date engine + email
- [ ] Phase 5 — Feedback
- [ ] Phase 6 — Dashboard
- [ ] Phase 7 — Hardening

## Getting started (local development)

### 1. Prerequisites

- Node.js 22+
- Docker (for Postgres + MailHog), or a local PostgreSQL 16

### 2. Environment

```bash
cp .env.example .env
# then edit .env — at minimum set a strong AUTH_SECRET:
#   openssl rand -base64 32
```

### 3. Start Postgres (+ MailHog for email testing)

```bash
docker compose up -d db mailhog
```

MailHog's inbox UI is at http://localhost:8025.

### 4. Install dependencies & set up the database

```bash
npm install
npm run prisma:generate
npm run prisma:migrate      # creates the schema (dev)
npm run prisma:seed         # creates the admin user from SEED_ADMIN_* in .env
```

### 5. Run the app

```bash
npm run dev
```

Open http://localhost:3000 and sign in with the seeded admin
(`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` from your `.env`).

The seed also creates a read-only **viewer** account for testing role-based access:
`viewer@bpi.example` / `ChangeMe123!`.

## Running everything in Docker

```bash
cp .env.example .env        # set AUTH_SECRET
docker compose up --build   # starts db, mailhog, and the app
```

On first run, apply migrations and seed inside the app container:

```bash
docker compose exec app npx prisma migrate deploy
docker compose exec app npx tsx prisma/seed.ts
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run typecheck` | TypeScript check (no emit) |
| `npm run lint` | ESLint |
| `npm run prisma:migrate` | Create/apply a dev migration |
| `npm run prisma:deploy` | Apply migrations (production) |
| `npm run prisma:seed` | Seed data |
| `npm run cron` | Run the scheduled worker (daily due-date scan; Phase 4) |
| `npm test` | Unit tests (Vitest) |
| `npm run test:e2e` | Playwright smoke tests |

## Project structure

```
/app                # Next.js App Router (routes + API handlers)
  /(dashboard)      # protected pages
  /login            # login page
  /api/auth         # Auth.js route handlers
/components/ui       # shadcn-based UI components
/lib                 # db client, auth, rbac, validators, (later) email/cron/rules
/prisma              # schema.prisma, migrations, seed.ts
/scripts             # cron entrypoint, (later) csv-import utilities
/tests               # vitest (unit) + playwright (e2e)
docker-compose.yml · Dockerfile · .env.example
```

## Security & configuration notes

- Passwords are hashed with bcrypt; secrets (DB URL, `AUTH_SECRET`, SMTP creds) live in
  environment variables only — never commit `.env`.
- Authorization is centralized in `lib/rbac.ts` and the Auth.js callbacks
  (`lib/auth.config.ts`) so a future SSO role mapping drops in without rewrites.
- Completion threshold, reminder offsets, auto-send toggle, and SMTP settings are
  configuration (env now; Settings page in Phase 4), not hard-coded.
