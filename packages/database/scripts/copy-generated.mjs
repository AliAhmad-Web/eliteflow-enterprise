import { cpSync, existsSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "src", "generated");
const destination = join(root, "dist", "generated");

if (!existsSync(source)) {
  console.error(
    "[@enterprise/database] Missing src/generated — run prisma generate first.",
  );
  process.exit(1);
}

rmSync(destination, { recursive: true, force: true });
cpSync(source, destination, { recursive: true });
console.log("[@enterprise/database] Copied Prisma client to dist/generated");
