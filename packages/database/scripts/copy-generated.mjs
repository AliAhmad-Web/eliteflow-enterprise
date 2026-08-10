import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
} from "node:fs";
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

try {
  rmSync(destination, { recursive: true, force: true });
} catch (error) {
  console.warn(
    "[@enterprise/database] Could not remove dist/generated (likely locked engine). Overwriting in place.",
    error instanceof Error ? error.message : error,
  );
}

function copyTree(src, dest) {
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src, { withFileTypes: true })) {
    const from = join(src, entry.name);
    const to = join(dest, entry.name);
    if (entry.isDirectory()) {
      copyTree(from, to);
      continue;
    }
    try {
      cpSync(from, to, { force: true });
    } catch (error) {
      // Skip locked Prisma query engines on Windows; runtime can reuse prior .node.
      if (entry.name.endsWith(".node")) {
        console.warn(
          `[@enterprise/database] Skipped locked engine ${entry.name}`,
        );
        continue;
      }
      throw error;
    }
  }
}

copyTree(source, destination);

// Sanity: types must be present for consumers.
if (!existsSync(join(destination, "client", "index.d.ts"))) {
  console.error(
    "[@enterprise/database] Copy incomplete — dist/generated/client/index.d.ts missing.",
  );
  process.exit(1);
}

console.log("[@enterprise/database] Copied Prisma client to dist/generated");
