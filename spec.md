# spec.md — Training Program Monitoring System

**How to use this file:** Hand this file to Claude Code and say "Build the system described in spec.md, following the build phases in order. Pause at the end of each phase for review." Everything marked `[ASSUMPTION]` is a decision made because it wasn't specified — change any of them before building and the rest of the spec still holds.

## 1. Context

We are the Manpower Transformation & Training Team for the Consumer Bank segment of the Bank of the Philippine Islands (BPI). We run several training programs that build skills for branch and relationship-banking staff.

- Each program has a focus, a target audience, a number of training days, a set of modules, and a set of deliverables.
- Participants belong to role-based cohorts: CSSA, SA, ABM, BM, RM.
- We currently have limited visibility into attendance, deliverable completion, due dates, and feedback, and we track these manually.

We want one application that centralizes all of this and shows it on a dashboard.

## 2. Goals

The system must let our team:

1. Track attendance of every participant, per module session.
2. See which modules a participant missed.
3. Show what % of each cohort has completed each program.
4. Track completion of deliverables per participant.
5. Monitor due dates for deliverables.
6. Automatically email participants about (a) upcoming due dates, (b) due-today items, and (c) late/overdue submissions.
7. Collect and summarize participant feedback per program/module.
8. Present all of the above on a clear dashboard.

## 3. Assumptions (change these if wrong)

- **[ASSUMPTION] Hosting:** Self-hosted, deployable via Docker so BPI IT can run it on-prem or in a private cloud. No dependency on any external SaaS to run the app.
- **[ASSUMPTION] Data entry:** The app is the source of truth. Trainers/admins enter attendance and mark deliverable submissions in-app. To migrate existing records, the app supports CSV/Excel bulk import for participants, enrollments, attendance, and submissions.
- **[ASSUMPTION] Users:** Two roles at launch — Admin/Trainer (full access) and Viewer (read-only dashboards). Participants do not log in at launch (they only receive emails). A participant self-service portal is a documented future phase.
- **[ASSUMPTION] Auth:** Email + password with hashed credentials, plus a clean seam to later swap in BPI SSO / Active Directory (SAML/OIDC). Do not hard-code an SSO dependency now.
- **[ASSUMPTION] Email delivery:** Send via SMTP, fully configurable by environment variable, so it works with either BPI Exchange/Outlook or a transactional provider. Reminder emails are generated automatically but require one-click admin approval before sending (a "review queue"), so no mail goes out unreviewed. An "auto-send" toggle can turn approval off later.
- **[ASSUMPTION] Feedback:** The app includes its own built-in feedback form feature (create form → collect responses → auto-summarize), and can also import responses from an external form (Microsoft/Google Forms) via CSV.
- **[ASSUMPTION] Curriculum:** Modules can differ by cohort. Model this so a program's module list can be tailored per cohort rather than assuming one shared curriculum.
- **[ASSUMPTION] Scale:** Design for up to ~5,000 participants, ~50 programs, ~30 modules/program, and concurrent program runs. A single PostgreSQL instance is sufficient; no distributed system required.
- **[ASSUMPTION] Locale:** Timezone Asia/Manila; dates displayed as `DD MMM YYYY`; currency not relevant.

## 4. Tech stack

- **Framework:** Next.js (App Router) + TypeScript — single codebase for UI and API.
- **Database:** PostgreSQL.
- **ORM:** Prisma (typed schema + migrations).
- **Auth:** Auth.js (NextAuth) with a Credentials provider now; structured so an OIDC/SAML provider can be added without rewriting authorization logic.
- **Styling/UI:** Tailwind CSS + shadcn/ui components.
- **Charts:** Recharts.
- **Background jobs / scheduling:** A scheduled worker (node-cron inside a small standalone process, or a `/api/cron` route triggered by an external scheduler — implement node-cron by default) that runs daily to evaluate due dates and generate reminder drafts.
- **Email:** Nodemailer over SMTP, with HTML email templates.
- **Validation:** Zod for all form and API input.
- **Testing:** Vitest (unit) + Playwright (a few end-to-end smoke tests).
- **Packaging:** Dockerfile + docker-compose (app + postgres + optional mailhog for local email testing).

If BPI IT mandates a different stack (e.g., .NET/Java + Angular), keep the data model, features, and API contract in this spec identical and swap the implementation.

## 5. Data model

Implement with Prisma. Entities and key relationships:

### Core entities

- **User** — `id, name, email (unique), passwordHash, role (ADMIN | VIEWER), isActive, createdAt`.
- **Cohort** — role grouping. Seed the five: `CSSA, SA, ABM, BM, RM`. Fields: `id, code, name, description`.
- **Participant** — `id, employeeId (unique), firstName, lastName, email (unique), cohortId (FK), branch, region, isActive, createdAt`.
- **Program** — `id, code, name, focus, targetAudience, totalTrainingDays, description, status (DRAFT | ACTIVE | ARCHIVED), createdAt`.
- **Module** — a unit within a program. `id, programId (FK), title, sequence (order), description`. A module MAY be scoped to specific cohorts (see `ModuleCohort`).
- **ModuleCohort** — join table so a module can be marked as applicable to one or more cohorts (`moduleId, cohortId`). If a module has no rows here, it applies to all cohorts in the program.
- **ProgramRun / Batch** — a scheduled offering of a program. `id, programId (FK), name (e.g. "2026 Q1 Batch A"), startDate, endDate, status`.
- **Enrollment** — a participant enrolled in a program run. `id, participantId (FK), programRunId (FK), enrolledAt, completionStatus (IN_PROGRESS | COMPLETED | DROPPED), completedAt`. Unique on (participant, programRun).

### Attendance

- **Session** — a scheduled delivery of a module within a run. `id, programRunId (FK), moduleId (FK), sessionDate, startTime, endTime, location/mode, trainerName`.
- **Attendance** — `id, sessionId (FK), participantId (FK), status (PRESENT | ABSENT | LATE | EXCUSED), markedByUserId, markedAt`. Unique on (session, participant).
  - "Modules missed" = modules for which the participant has an ABSENT (or no) attendance record across that module's sessions.

### Deliverables

- **Deliverable** — a required output. `id, programId (FK), moduleId (nullable FK), title, description, dueOffsetDays (nullable — days after run start) OR absolute due handled per run`. Fields: `weight (optional), isRequired`.
- **DeliverableDueDate** — resolves a concrete due date per program run: `id, deliverableId (FK), programRunId (FK), dueDate`.
- **Submission** — `id, deliverableId (FK), participantId (FK), programRunId (FK), status (NOT_SUBMITTED | SUBMITTED | LATE | RESUBMIT | ACCEPTED), submittedAt, reviewedByUserId, reviewedAt, remarks, fileUrl (nullable)`. Unique on (deliverable, participant, programRun). Default status NOT_SUBMITTED.

### Feedback

- **FeedbackForm** — `id, programId (nullable), moduleId (nullable), title, isActive`.
- **FeedbackQuestion** — `id, formId (FK), text, type (RATING_1_5 | RATING_1_10 | TEXT | MULTIPLE_CHOICE), options (json, nullable), sequence`.
- **FeedbackResponse** — `id, formId (FK), participantId (nullable — allow anonymous), programRunId (nullable), submittedAt`.
- **FeedbackAnswer** — `id, responseId (FK), questionId (FK), ratingValue (nullable), textValue (nullable), choiceValue (nullable)`.

### Notifications

- **NotificationLog** — every reminder generated/sent. `id, participantId (FK), deliverableId (FK), programRunId (FK), type (UPCOMING | DUE_TODAY | OVERDUE), status (DRAFT | APPROVED | SENT | FAILED | SKIPPED), scheduledFor, sentAt, subject, body, error`. Prevents duplicate sends for the same (participant, deliverable, type, day).

Add sensible indexes on all foreign keys and on the date fields used for due-date scans.

## 6. Functional requirements

### 6.1 Program & curriculum management

- CRUD for programs, modules (with drag-to-reorder `sequence`), and per-cohort module scoping.
- CRUD for program runs/batches, sessions, and deliverables + due dates.
- Deliverable due dates resolve per run either from `dueOffsetDays` relative to run start, or an explicit `DeliverableDueDate` override.

### 6.2 Participant & enrollment management

- CRUD for participants; assign each to exactly one cohort.
- Enroll participants into program runs (individually and in bulk).
- Bulk CSV/Excel import with a downloadable template and a dry-run validation preview (show rows that will be created/updated/rejected before committing).

### 6.3 Attendance

- Per session, mark each enrolled participant PRESENT/ABSENT/LATE/EXCUSED in a fast grid UI (keyboard-friendly, save all at once).
- Bulk import attendance by CSV.
- Views:
  - Per participant: attendance timeline, list of modules missed, attendance rate.
  - Per session: roster with status counts.
  - Per program run / cohort: attendance rate rollups.

### 6.4 Deliverables & completion

- Grid to mark submissions per deliverable per participant, with status + remarks + optional file link.
- Auto-flag a submission LATE when `submittedAt > dueDate`, and OVERDUE/NOT_SUBMITTED when past due with no submission.
- **Program completion rule [ASSUMPTION]:** a participant is COMPLETED for a run when they (a) have attendance ≥ a configurable threshold (default 80% of applicable module sessions) and (b) have all `isRequired` deliverables in ACCEPTED/SUBMITTED status. Make the threshold and rule configurable in settings. Recompute completion status on relevant events and nightly.
- Cohort completion % = COMPLETED enrollments ÷ total enrollments, grouped by cohort (filterable by program/run).

### 6.5 Due-date monitoring & email engine

- A daily scheduled job (Asia/Manila) scans upcoming and past due dates and generates `NotificationLog` drafts:
  - **UPCOMING:** N days before due (default reminders at 3 days and 1 day before — configurable).
  - **DUE_TODAY:** on the due date.
  - **OVERDUE:** for each still-missing required submission after the due date (default: re-notify every 2 days, max 3 times — configurable).
- Drafts land in a Reminder Review Queue. An admin reviews, edits if needed, and clicks Approve & Send (single or batch). Respect an auto-send setting to bypass approval later.
- Sending uses SMTP + HTML templates with variables: participant name, program, module, deliverable, due date, days remaining/overdue, submission link. Log every send with status; never double-send the same (participant, deliverable, type) on the same day. Provide a resend-on-failure action.
- Store templates in the DB (editable in-app) with sensible defaults seeded.

### 6.6 Feedback

- Build feedback forms in-app (question types: 1–5 rating, 1–10 rating, free text, multiple choice).
- Distribute via a shareable public link (token-based, no login needed for the respondent); optionally tie a response to a participant + run.
- Import external form responses via CSV mapped to a form's questions.
- Auto-summary per form/program/module: average rating per question, rating distributions, response count/rate, and a compact list of free-text comments (with simple keyword frequency). Surface top/bottom-rated modules.

### 6.7 Roles & permissions

- **ADMIN:** full CRUD, import, approve/send emails, manage users and settings.
- **VIEWER:** read-only dashboards and exports; no edits, no sending.
- Enforce on both the API and the UI. Centralize authorization checks so an SSO role mapping can be dropped in later.

## 7. Dashboard

A landing dashboard plus drill-down pages. Every widget is filterable by program, program run, cohort, and date range.

**Top-level KPI cards:** active participants, active program runs, overall completion %, overall attendance rate, deliverables due this week, overdue deliverables count, feedback responses this month.

**Charts & tables:**

1. Completion % by cohort (bar) — the headline metric, per program.
2. Attendance rate by cohort / by module (bar/heatmap).
3. Deliverable status breakdown (stacked bar: not submitted / submitted / late / accepted).
4. Due-date timeline — upcoming and overdue deliverables (next 14 days + overdue), sortable.
5. Modules-missed leaderboard — participants with the most missed modules (drill to detail).
6. Feedback summary — average ratings and top comments per program/module.
7. At-risk participants table — low attendance and/or missing required deliverables, with quick "send reminder" action.

**Exports:** every table exportable to CSV/Excel. Provide a printable program-run summary.

## 8. Non-functional requirements (bank context — take seriously)

- **Security:** hash passwords (bcrypt/argon2); all input validated with Zod; parameterized queries via Prisma (no raw string SQL); CSRF protection on mutations; secure, httpOnly session cookies; rate-limit auth and the public feedback endpoint.
- **PII handling:** participant names, emails, employee IDs, and branch are personal data — restrict access by role, don't log PII in plaintext application logs, and keep secrets (SMTP creds, DB URL, auth secret) in environment variables only. Include an `.env.example`, never commit real secrets.
- **Audit:** record `markedBy/reviewedBy/approvedBy` + timestamps on attendance, submissions, and email sends. Add a lightweight audit log for create/update/delete on core entities.
- **Reliability:** email sends and the nightly job must be idempotent and safe to re-run.
- **Accessibility & UX:** keyboard-navigable attendance/submission grids; responsive layout; clear empty/loading/error states.
- **Config:** completion threshold, reminder offsets, auto-send toggle, and SMTP settings all configurable (settings page or env), not hard-coded.

## 9. Project structure

```
/app                # Next.js App Router (routes + API handlers)
  /(dashboard)      # protected pages
  /api              # route handlers (REST-ish, per resource)
  /feedback/[token] # public feedback form
/components          # UI components (shadcn-based)
/lib                 # db client, auth, email, cron logic, completion rules, validators
/prisma              # schema.prisma, migrations, seed.ts
/emails              # HTML email templates
/scripts             # csv-import utilities, cron entrypoint
/tests               # vitest + playwright
docker-compose.yml
Dockerfile
.env.example
README.md
```

Keep business rules (completion calculation, due-date evaluation, late-flagging) in pure, unit-tested functions in `/lib`, separate from route handlers.

## 10. Build phases (do these in order; pause after each)

- **Phase 0 — Scaffold.** Next.js + TS + Tailwind + shadcn; Prisma + Postgres via docker-compose; Auth.js credentials; `.env.example`; README with run instructions. Deliver a login page + empty protected dashboard shell.
- **Phase 1 — Data model + admin CRUD.** Full Prisma schema from §5, migrations, and CRUD screens for programs, modules (with per-cohort scoping + reorder), program runs, sessions, deliverables, participants, enrollments. Seed the 5 cohorts and a small demo dataset.
- **Phase 2 — Attendance.** Session attendance grid, per-participant/per-session/per-run views, modules-missed logic, CSV import with dry-run preview.
- **Phase 3 — Deliverables & completion.** Submission grid, auto late/overdue flagging, configurable completion rule, cohort completion %.
- **Phase 4 — Due-date engine + email.** Nightly job, NotificationLog, reminder review queue, SMTP send with templates, idempotency + logging, settings for offsets/threshold/auto-send.
- **Phase 5 — Feedback.** Form builder, public tokened response page, CSV import, auto-summary views.
- **Phase 6 — Dashboard.** All KPI cards, charts, at-risk table, exports, global filters.
- **Phase 7 — Hardening.** Role enforcement audit, audit log, rate limiting, tests (unit for `/lib` rules + a few Playwright smoke flows), Dockerfile finalization, deployment README.

After each phase: run migrations, run tests, and confirm the phase's screens work against seed data before moving on.

## 11. Seed data (for demos & tests)

- 5 cohorts (CSSA, SA, ABM, BM, RM).
- 2 programs, each with 5–6 modules and 2–3 deliverables; one program with cohort-specific modules to exercise `ModuleCohort`.
- 1 program run per program with sessions dated around "today" so upcoming/due/overdue reminders all have examples.
- ~30 participants spread across cohorts, enrolled, with a mix of attendance and submission states (including some overdue) so the dashboard and email queue are populated on first run.
- 1 feedback form with a few responses.

## 12. Acceptance criteria

The build is done when, against seed data, an admin can:

1. See each participant's attendance and their list of missed modules.
2. See completion % per cohort for a program.
3. See all deliverable statuses and which are overdue.
4. See a due-date timeline and generate + approve + send reminder emails (verified via MailHog locally), with sends logged and no duplicates.
5. Create a feedback form, collect responses, and view an auto-summary.
6. Do everything above from a single filterable dashboard, with CSV/Excel export.
7. A VIEWER can see dashboards but cannot edit or send.

## 13. Open questions to confirm before/while building

(These don't block the build — defaults above are used until answered.)

- Exact completion rule and attendance threshold per program.
- Whether participants need logins (self-service portal) — currently out of scope.
- SSO/Active Directory integration details from BPI IT (defer, but keep the seam).
- Whether email must route strictly through BPI Exchange (SMTP relay details).
- Whether file uploads for deliverables are needed in-app vs. just a link/status (currently: link + status).
