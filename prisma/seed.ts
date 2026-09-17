import "dotenv/config";
import {
  PrismaClient,
  Role,
  ProgramStatus,
  RunStatus,
  DeliveryMode,
  NotificationType,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEFAULT_TEMPLATES } from "../lib/email/templates";

const prisma = new PrismaClient();

async function seedEmailTemplates() {
  for (const type of Object.keys(DEFAULT_TEMPLATES) as NotificationType[]) {
    const t = DEFAULT_TEMPLATES[type];
    await prisma.emailTemplate.upsert({
      where: { type },
      update: {}, // keep any in-app edits on re-seed
      create: { type, subject: t.subject, body: t.body },
    });
  }
  console.log(`Seeded ${Object.keys(DEFAULT_TEMPLATES).length} email templates`);
}

const COHORTS = [
  { code: "CSSA", name: "Customer Sales & Service Associate" },
  { code: "SA", name: "Sales Associate" },
  { code: "ABM", name: "Assistant Branch Manager" },
  { code: "BM", name: "Branch Manager" },
  { code: "RM", name: "Relationship Manager" },
];

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

async function seedUsers() {
  const email = (process.env.SEED_ADMIN_EMAIL ?? "admin@bpi.example").toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!";
  const name = process.env.SEED_ADMIN_NAME ?? "Training Admin";
  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.upsert({
    where: { email },
    update: { name, role: Role.ADMIN, isActive: true },
    create: { email, name, passwordHash, role: Role.ADMIN, isActive: true },
  });

  // A read-only viewer for testing RBAC.
  const viewerHash = await bcrypt.hash("ChangeMe123!", 12);
  await prisma.user.upsert({
    where: { email: "viewer@bpi.example" },
    update: { role: Role.VIEWER, isActive: true },
    create: {
      email: "viewer@bpi.example",
      name: "Training Viewer",
      passwordHash: viewerHash,
      role: Role.VIEWER,
      isActive: true,
    },
  });
  console.log(`Seeded users: ${email} (ADMIN), viewer@bpi.example (VIEWER)`);
}

async function seedCohorts() {
  for (const c of COHORTS) {
    await prisma.cohort.upsert({
      where: { code: c.code },
      update: { name: c.name },
      create: { code: c.code, name: c.name },
    });
  }
  console.log(`Seeded ${COHORTS.length} cohorts`);
}

async function wipeDemoData() {
  // Remove previously-seeded demo programs (cascades to modules, runs,
  // sessions, deliverables, enrollments, etc.) and demo participants so the
  // seed is safe to re-run.
  await prisma.program.deleteMany({ where: { code: { in: ["RB-CORE", "BR-OPS"] } } });
  await prisma.participant.deleteMany({ where: { employeeId: { startsWith: "EMP" } } });
}

async function seedParticipants() {
  const cohorts = await prisma.cohort.findMany();
  const byCode = new Map(cohorts.map((c) => [c.code, c.id]));
  const branches = ["Makati Main", "Ortigas", "Cebu IT Park", "Davao", "BGC"];
  const regions = ["NCR", "Visayas", "Mindanao"];

  const created: { id: string; cohortCode: string }[] = [];
  let n = 0;
  // 6 participants per cohort => 30 total.
  for (const c of COHORTS) {
    for (let i = 0; i < 6; i++) {
      n++;
      const employeeId = `EMP${String(n).padStart(4, "0")}`;
      const p = await prisma.participant.create({
        data: {
          employeeId,
          firstName: `First${n}`,
          lastName: `${c.code}-${i + 1}`,
          email: `participant${n}@bpi.example`,
          cohortId: byCode.get(c.code)!,
          branch: branches[n % branches.length],
          region: regions[n % regions.length],
        },
      });
      created.push({ id: p.id, cohortCode: c.code });
    }
  }
  console.log(`Seeded ${created.length} participants`);
  return created;
}

async function seedPrograms() {
  const cohorts = await prisma.cohort.findMany();
  const byCode = new Map(cohorts.map((c) => [c.code, c.id]));
  const today = new Date();

  // ---- Program 1: shared curriculum across all cohorts ----
  const prog1 = await prisma.program.create({
    data: {
      code: "RB-CORE",
      name: "Relationship Banking Core",
      focus: "Consultative selling & client relationships",
      targetAudience: "Branch and relationship-banking staff",
      totalTrainingDays: 6,
      status: ProgramStatus.ACTIVE,
      description: "Foundational program for consumer-bank relationship building.",
      modules: {
        create: [
          { title: "Client Discovery & Needs Analysis", sequence: 1 },
          { title: "Product Knowledge: Deposits & Loans", sequence: 2 },
          { title: "Consultative Selling", sequence: 3 },
          { title: "Objection Handling", sequence: 4 },
          { title: "Compliance & KYC Essentials", sequence: 5 },
          { title: "Relationship Retention", sequence: 6 },
        ],
      },
      deliverables: {
        create: [
          { title: "Client Needs Analysis Worksheet", dueOffsetDays: 7, weight: 1, isRequired: true },
          { title: "Role-play Assessment", dueOffsetDays: 21, weight: 2, isRequired: true },
          { title: "Capstone Client Plan", dueOffsetDays: 40, weight: 3, isRequired: true },
        ],
      },
    },
  });

  // ---- Program 2: cohort-specific modules (exercises ModuleCohort) ----
  const prog2 = await prisma.program.create({
    data: {
      code: "BR-OPS",
      name: "Branch Operations Excellence",
      focus: "Operational rigor & leadership",
      targetAudience: "Branch operations and management staff",
      totalTrainingDays: 5,
      status: ProgramStatus.ACTIVE,
      description: "Operations and leadership program with cohort-tailored modules.",
      modules: {
        create: [
          { title: "Teller Operations & Cash Management", sequence: 1 },
          { title: "Fraud Prevention & Controls", sequence: 2 },
          { title: "Service Recovery", sequence: 3 },
          { title: "Branch Leadership Clinic (ABM/BM)", sequence: 4 },
          { title: "RM Portfolio Deep-Dive", sequence: 5 },
        ],
      },
      deliverables: {
        create: [
          { title: "Ops Control Checklist", dueOffsetDays: 10, weight: 1, isRequired: true },
          { title: "Branch Improvement Proposal", dueOffsetDays: 30, weight: 2, isRequired: true },
        ],
      },
    },
  });

  // Scope program 2's leadership/RM modules to specific cohorts.
  const prog2Modules = await prisma.module.findMany({ where: { programId: prog2.id } });
  const leadership = prog2Modules.find((m) => m.title.includes("Leadership Clinic"));
  const rmModule = prog2Modules.find((m) => m.title.includes("RM Portfolio"));
  if (leadership) {
    await prisma.moduleCohort.createMany({
      data: [
        { moduleId: leadership.id, cohortId: byCode.get("ABM")! },
        { moduleId: leadership.id, cohortId: byCode.get("BM")! },
      ],
      skipDuplicates: true,
    });
  }
  if (rmModule) {
    await prisma.moduleCohort.create({
      data: { moduleId: rmModule.id, cohortId: byCode.get("RM")! },
    });
  }

  // ---- Runs (one per program), windowed around today ----
  const run1 = await prisma.programRun.create({
    data: {
      programId: prog1.id,
      name: "2026 Q1 Batch A",
      startDate: addDays(today, -15),
      endDate: addDays(today, 30),
      status: RunStatus.ACTIVE,
    },
  });
  const run2 = await prisma.programRun.create({
    data: {
      programId: prog2.id,
      name: "2026 Q1 Ops Cohort",
      startDate: addDays(today, -10),
      endDate: addDays(today, 25),
      status: RunStatus.ACTIVE,
    },
  });

  // ---- Sessions: one per module, spread from past to future around today ----
  async function seedSessions(programId: string, runId: string, start: Date) {
    const modules = await prisma.module.findMany({
      where: { programId },
      orderBy: { sequence: "asc" },
    });
    let offset = -12;
    for (const m of modules) {
      await prisma.session.create({
        data: {
          programRunId: runId,
          moduleId: m.id,
          sessionDate: addDays(start, offset + 12), // start .. start+N
          startTime: "09:00",
          endTime: "12:00",
          mode: DeliveryMode.IN_PERSON,
          location: "Training Center, Makati",
          trainerName: "J. Cruz",
        },
      });
      offset += 5;
    }
  }
  await seedSessions(prog1.id, run1.id, run1.startDate);
  await seedSessions(prog2.id, run2.id, run2.startDate);

  console.log("Seeded 2 programs, modules (with cohort scoping), deliverables, 2 runs, sessions");
  return { prog1, prog2, run1, run2 };
}

async function seedEnrollments(
  participants: { id: string; cohortCode: string }[],
  run1Id: string,
  run2Id: string
) {
  // Everyone enrolls in the core run; ops/management-ish cohorts also in run 2.
  const run1Data = participants.map((p) => ({ participantId: p.id, programRunId: run1Id }));
  await prisma.enrollment.createMany({ data: run1Data, skipDuplicates: true });

  const run2Participants = participants.filter((p) =>
    ["CSSA", "ABM", "BM", "RM"].includes(p.cohortCode)
  );
  await prisma.enrollment.createMany({
    data: run2Participants.map((p) => ({ participantId: p.id, programRunId: run2Id })),
    skipDuplicates: true,
  });

  console.log(
    `Seeded enrollments: ${run1Data.length} into run 1, ${run2Participants.length} into run 2`
  );
}

async function main() {
  await seedUsers();
  await seedCohorts();
  await seedEmailTemplates();
  await wipeDemoData();
  const participants = await seedParticipants();
  const { run1, run2 } = await seedPrograms();
  await seedEnrollments(participants, run1.id, run2.id);
  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
