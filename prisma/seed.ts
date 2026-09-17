import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/**
 * Phase 0 seed: create the admin user from env so you can log in immediately.
 * Phase 1 expands this with cohorts, programs, participants, and demo data.
 */
async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL ?? "admin@bpi.example").toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!";
  const name = process.env.SEED_ADMIN_NAME ?? "Training Admin";

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.user.upsert({
    where: { email },
    update: { name, role: Role.ADMIN, isActive: true },
    create: { email, name, passwordHash, role: Role.ADMIN, isActive: true },
  });

  console.log(`Seeded admin user: ${admin.email} (role=${admin.role})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
