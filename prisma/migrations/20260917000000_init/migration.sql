-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'VIEWER');

-- CreateEnum
CREATE TYPE "ProgramStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "RunStatus" AS ENUM ('PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CompletionStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'DROPPED');

-- CreateEnum
CREATE TYPE "DeliveryMode" AS ENUM ('IN_PERSON', 'VIRTUAL', 'HYBRID');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'EXCUSED');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('NOT_SUBMITTED', 'SUBMITTED', 'LATE', 'RESUBMIT', 'ACCEPTED');

-- CreateEnum
CREATE TYPE "FeedbackQuestionType" AS ENUM ('RATING_1_5', 'RATING_1_10', 'TEXT', 'MULTIPLE_CHOICE');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('UPCOMING', 'DUE_TODAY', 'OVERDUE');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('DRAFT', 'APPROVED', 'SENT', 'FAILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'VIEWER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cohorts" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "cohorts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "participants" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "cohortId" TEXT NOT NULL,
    "branch" TEXT,
    "region" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "programs" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "focus" TEXT,
    "targetAudience" TEXT,
    "totalTrainingDays" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "status" "ProgramStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modules" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "description" TEXT,

    CONSTRAINT "modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "module_cohorts" (
    "moduleId" TEXT NOT NULL,
    "cohortId" TEXT NOT NULL,

    CONSTRAINT "module_cohorts_pkey" PRIMARY KEY ("moduleId","cohortId")
);

-- CreateTable
CREATE TABLE "program_runs" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "RunStatus" NOT NULL DEFAULT 'PLANNED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "program_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enrollments" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "programRunId" TEXT NOT NULL,
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completionStatus" "CompletionStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "programRunId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "sessionDate" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "location" TEXT,
    "mode" "DeliveryMode" NOT NULL DEFAULT 'IN_PERSON',
    "trainerName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'ABSENT',
    "markedByUserId" TEXT,
    "markedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deliverables" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "moduleId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueOffsetDays" INTEGER,
    "weight" DOUBLE PRECISION,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deliverables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deliverable_due_dates" (
    "id" TEXT NOT NULL,
    "deliverableId" TEXT NOT NULL,
    "programRunId" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deliverable_due_dates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submissions" (
    "id" TEXT NOT NULL,
    "deliverableId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "programRunId" TEXT NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'NOT_SUBMITTED',
    "submittedAt" TIMESTAMP(3),
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "remarks" TEXT,
    "fileUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback_forms" (
    "id" TEXT NOT NULL,
    "programId" TEXT,
    "moduleId" TEXT,
    "title" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "publicToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feedback_forms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback_questions" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "type" "FeedbackQuestionType" NOT NULL,
    "options" JSONB,
    "sequence" INTEGER NOT NULL,

    CONSTRAINT "feedback_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback_responses" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "participantId" TEXT,
    "programRunId" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback_answers" (
    "id" TEXT NOT NULL,
    "responseId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "ratingValue" INTEGER,
    "textValue" TEXT,
    "choiceValue" TEXT,

    CONSTRAINT "feedback_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_logs" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "deliverableId" TEXT NOT NULL,
    "programRunId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "dedupeDay" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "approvedByUserId" TEXT,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "email_templates" (
    "id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "cohorts_code_key" ON "cohorts"("code");

-- CreateIndex
CREATE UNIQUE INDEX "participants_employeeId_key" ON "participants"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "participants_email_key" ON "participants"("email");

-- CreateIndex
CREATE INDEX "participants_cohortId_idx" ON "participants"("cohortId");

-- CreateIndex
CREATE UNIQUE INDEX "programs_code_key" ON "programs"("code");

-- CreateIndex
CREATE INDEX "modules_programId_idx" ON "modules"("programId");

-- CreateIndex
CREATE INDEX "modules_programId_sequence_idx" ON "modules"("programId", "sequence");

-- CreateIndex
CREATE INDEX "module_cohorts_cohortId_idx" ON "module_cohorts"("cohortId");

-- CreateIndex
CREATE INDEX "program_runs_programId_idx" ON "program_runs"("programId");

-- CreateIndex
CREATE INDEX "program_runs_startDate_idx" ON "program_runs"("startDate");

-- CreateIndex
CREATE INDEX "enrollments_programRunId_idx" ON "enrollments"("programRunId");

-- CreateIndex
CREATE INDEX "enrollments_participantId_idx" ON "enrollments"("participantId");

-- CreateIndex
CREATE UNIQUE INDEX "enrollments_participantId_programRunId_key" ON "enrollments"("participantId", "programRunId");

-- CreateIndex
CREATE INDEX "sessions_programRunId_idx" ON "sessions"("programRunId");

-- CreateIndex
CREATE INDEX "sessions_moduleId_idx" ON "sessions"("moduleId");

-- CreateIndex
CREATE INDEX "sessions_sessionDate_idx" ON "sessions"("sessionDate");

-- CreateIndex
CREATE INDEX "attendance_participantId_idx" ON "attendance"("participantId");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_sessionId_participantId_key" ON "attendance"("sessionId", "participantId");

-- CreateIndex
CREATE INDEX "deliverables_programId_idx" ON "deliverables"("programId");

-- CreateIndex
CREATE INDEX "deliverables_moduleId_idx" ON "deliverables"("moduleId");

-- CreateIndex
CREATE INDEX "deliverable_due_dates_programRunId_idx" ON "deliverable_due_dates"("programRunId");

-- CreateIndex
CREATE INDEX "deliverable_due_dates_dueDate_idx" ON "deliverable_due_dates"("dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "deliverable_due_dates_deliverableId_programRunId_key" ON "deliverable_due_dates"("deliverableId", "programRunId");

-- CreateIndex
CREATE INDEX "submissions_participantId_idx" ON "submissions"("participantId");

-- CreateIndex
CREATE INDEX "submissions_programRunId_idx" ON "submissions"("programRunId");

-- CreateIndex
CREATE INDEX "submissions_deliverableId_idx" ON "submissions"("deliverableId");

-- CreateIndex
CREATE UNIQUE INDEX "submissions_deliverableId_participantId_programRunId_key" ON "submissions"("deliverableId", "participantId", "programRunId");

-- CreateIndex
CREATE UNIQUE INDEX "feedback_forms_publicToken_key" ON "feedback_forms"("publicToken");

-- CreateIndex
CREATE INDEX "feedback_forms_programId_idx" ON "feedback_forms"("programId");

-- CreateIndex
CREATE INDEX "feedback_forms_moduleId_idx" ON "feedback_forms"("moduleId");

-- CreateIndex
CREATE INDEX "feedback_questions_formId_idx" ON "feedback_questions"("formId");

-- CreateIndex
CREATE INDEX "feedback_responses_formId_idx" ON "feedback_responses"("formId");

-- CreateIndex
CREATE INDEX "feedback_responses_participantId_idx" ON "feedback_responses"("participantId");

-- CreateIndex
CREATE INDEX "feedback_answers_responseId_idx" ON "feedback_answers"("responseId");

-- CreateIndex
CREATE INDEX "feedback_answers_questionId_idx" ON "feedback_answers"("questionId");

-- CreateIndex
CREATE INDEX "notification_logs_status_idx" ON "notification_logs"("status");

-- CreateIndex
CREATE INDEX "notification_logs_scheduledFor_idx" ON "notification_logs"("scheduledFor");

-- CreateIndex
CREATE INDEX "notification_logs_programRunId_idx" ON "notification_logs"("programRunId");

-- CreateIndex
CREATE UNIQUE INDEX "notification_logs_participantId_deliverableId_type_dedupeDa_key" ON "notification_logs"("participantId", "deliverableId", "type", "dedupeDay");

-- CreateIndex
CREATE UNIQUE INDEX "email_templates_type_key" ON "email_templates"("type");

-- CreateIndex
CREATE INDEX "audit_logs_entity_entityId_idx" ON "audit_logs"("entity", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "participants" ADD CONSTRAINT "participants_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "cohorts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "modules" ADD CONSTRAINT "modules_programId_fkey" FOREIGN KEY ("programId") REFERENCES "programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_cohorts" ADD CONSTRAINT "module_cohorts_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_cohorts" ADD CONSTRAINT "module_cohorts_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "cohorts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_runs" ADD CONSTRAINT "program_runs_programId_fkey" FOREIGN KEY ("programId") REFERENCES "programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_programRunId_fkey" FOREIGN KEY ("programRunId") REFERENCES "program_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_programRunId_fkey" FOREIGN KEY ("programRunId") REFERENCES "program_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_markedByUserId_fkey" FOREIGN KEY ("markedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliverables" ADD CONSTRAINT "deliverables_programId_fkey" FOREIGN KEY ("programId") REFERENCES "programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliverables" ADD CONSTRAINT "deliverables_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "modules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliverable_due_dates" ADD CONSTRAINT "deliverable_due_dates_deliverableId_fkey" FOREIGN KEY ("deliverableId") REFERENCES "deliverables"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliverable_due_dates" ADD CONSTRAINT "deliverable_due_dates_programRunId_fkey" FOREIGN KEY ("programRunId") REFERENCES "program_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_deliverableId_fkey" FOREIGN KEY ("deliverableId") REFERENCES "deliverables"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_programRunId_fkey" FOREIGN KEY ("programRunId") REFERENCES "program_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_forms" ADD CONSTRAINT "feedback_forms_programId_fkey" FOREIGN KEY ("programId") REFERENCES "programs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_forms" ADD CONSTRAINT "feedback_forms_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "modules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_questions" ADD CONSTRAINT "feedback_questions_formId_fkey" FOREIGN KEY ("formId") REFERENCES "feedback_forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_responses" ADD CONSTRAINT "feedback_responses_formId_fkey" FOREIGN KEY ("formId") REFERENCES "feedback_forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_responses" ADD CONSTRAINT "feedback_responses_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "participants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_responses" ADD CONSTRAINT "feedback_responses_programRunId_fkey" FOREIGN KEY ("programRunId") REFERENCES "program_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_answers" ADD CONSTRAINT "feedback_answers_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "feedback_responses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_answers" ADD CONSTRAINT "feedback_answers_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "feedback_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_deliverableId_fkey" FOREIGN KEY ("deliverableId") REFERENCES "deliverables"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_programRunId_fkey" FOREIGN KEY ("programRunId") REFERENCES "program_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

