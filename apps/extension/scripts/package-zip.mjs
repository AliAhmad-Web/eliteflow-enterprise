import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  unlinkSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";

const require = createRequire(import.meta.url);
let archiver = null;
try {
  archiver = require("archiver");
} catch {
  archiver = null;
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const dist = join(root, "dist");
const releaseDir = join(root, "release");

if (!existsSync(dist)) {
  console.error("dist/ missing — run vite build first");
  process.exit(1);
}

mkdirSync(releaseDir, { recursive: true });

const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const zipName = `EliteFlow-Extension-${pkg.version}.zip`;
const zipPath = join(releaseDir, zipName);

if (existsSync(zipPath)) {
  unlinkSync(zipPath);
}

if (archiver) {
  const output = createWriteStream(zipPath);
  const archive = archiver("zip", { zlib: { level: 9 } });
  await new Promise((resolve, reject) => {
    output.on("close", resolve);
    archive.on("error", reject);
    archive.pipe(output);
    archive.directory(dist, false);
    void archive.finalize();
  });
} else {
  const result = spawnSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-Command",
      `Compress-Archive -Path "${join(dist, "*")}" -DestinationPath "${zipPath}" -Force`,
    ],
    { encoding: "utf8" },
  );
  if (result.status !== 0) {
    console.error(result.stderr || result.stdout);
    process.exit(1);
  }
}

const size = statSync(zipPath).size;
console.log(`Packaged ${zipName} (${Math.round(size / 1024)} KB)`);
console.log(`Path: ${zipPath}`);

const files = readdirSync(dist, { recursive: true }).map(String);
console.log(`Dist entries: ${files.length}`);
