import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const [emailInput] = process.argv.slice(2);
const newPassword = process.env.MAYKE_RESET_PASSWORD;

if (!emailInput || !newPassword) {
  console.error("Usage: MAYKE_RESET_PASSWORD=<new-password> tsx scripts/reset-password.ts <email>");
  process.exit(1);
}

const password = newPassword as string;

if (password.length < 12) {
  console.error("Password must be at least 12 characters.");
  process.exit(1);
}

const email = emailInput.trim().toLowerCase();
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: { email },
    select: { id: true }
  });

  if (users.length !== 1) {
    console.error(users.length === 0 ? "No user exists for that email." : "Multiple users matched that email. No change was made.");
    process.exitCode = 1;
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.update({
    where: { id: users[0].id },
    data: { passwordHash }
  });

  console.log("Password updated for the existing user.");
}

main()
  .catch(() => {
    console.error("Password reset failed. No password or database connection details were logged.");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
