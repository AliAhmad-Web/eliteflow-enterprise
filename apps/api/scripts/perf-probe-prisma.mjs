import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnv(filePath) {
  try {
    for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
      const match = line.match(/^DATABASE_URL=(.*)$/);
      if (!match) continue;
      let value = match[1].trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      return value;
    }
  } catch {
    return null;
  }
  return null;
}

const url =
  loadEnv(path.join(__dirname, "../../../packages/database/.env")) ||
  loadEnv(path.join(__dirname, "../.env"));

if (url) {
  process.env.DATABASE_URL = url;
}

const t0 = performance.now();
const { prisma } = await import("@enterprise/database");
const t1 = performance.now();

try {
  await Promise.race([
    prisma.$queryRawUnsafe("SELECT 1 as ok"),
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error("timeout")), 15_000);
    }),
  ]);
  console.log(
    JSON.stringify({
      importMs: Math.round(t1 - t0),
      queryMs: Math.round(performance.now() - t1),
      ok: true,
    }),
  );
} catch (error) {
  console.log(
    JSON.stringify({
      importMs: Math.round(t1 - t0),
      queryMs: Math.round(performance.now() - t1),
      ok: false,
      message: String(error.message).slice(0, 200),
    }),
  );
} finally {
  await prisma.$disconnect().catch(() => undefined);
}
