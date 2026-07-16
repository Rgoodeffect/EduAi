/**
 * Database seed script. Run with `npm run db:seed`.
 * Idempotent — safe to run multiple times against the same database.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const ROLES = [
  { name: "ADMIN" as const, description: "Full platform access: user management, all content, analytics." },
  { name: "TEACHER" as const, description: "Can upload documents, generate questions/exams, view analytics for own content." },
  { name: "STUDENT" as const, description: "Can view assigned documents, take exams, browse the question bank." },
];

const SEED_USERS = [
  {
    email: "admin@eduai.local",
    password: "Admin123!",
    firstName: "Ava",
    lastName: "Administrator",
    roles: ["ADMIN"],
  },
  {
    email: "teacher@eduai.local",
    password: "Teacher123!",
    firstName: "Tom",
    lastName: "Teacher",
    roles: ["TEACHER"],
  },
  {
    email: "student@eduai.local",
    password: "Student123!",
    firstName: "Sam",
    lastName: "Student",
    roles: ["STUDENT"],
  },
];

async function main() {
  console.log("Seeding roles...");
  for (const role of ROLES) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description },
      create: role,
    });
  }

  console.log("Seeding users...");
  for (const seedUser of SEED_USERS) {
    const passwordHash = await bcrypt.hash(seedUser.password, 12);
    const roles = await prisma.role.findMany({ where: { name: { in: seedUser.roles as ("ADMIN" | "TEACHER" | "STUDENT")[] } } });

    const user = await prisma.user.upsert({
      where: { email: seedUser.email },
      update: {},
      create: {
        email: seedUser.email,
        passwordHash,
        firstName: seedUser.firstName,
        lastName: seedUser.lastName,
        roles: { create: roles.map((role) => ({ roleId: role.id })) },
      },
    });
    console.log(`  - ${user.email} (${seedUser.roles.join(", ")})`);
  }

  console.log("\nSeed complete. Demo credentials:");
  for (const u of SEED_USERS) {
    console.log(`  ${u.email} / ${u.password}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
