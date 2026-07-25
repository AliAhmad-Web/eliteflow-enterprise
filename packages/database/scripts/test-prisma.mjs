import { PrismaClient } from "../src/generated/client/index.js";

const prisma = new PrismaClient();

try {
  const n = await prisma.user.count();
  console.log("prisma OK users=", n);
} catch (error) {
  console.log("prisma FAIL", error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
