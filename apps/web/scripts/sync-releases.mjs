/**
 * Discover EliteFlow release artifacts, hardlink them into
 * apps/web/public/releases (no duplicate disk usage), and write manifest.json.
 * Production serves binaries as static CDN assets at /releases/*.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, "..");
const monorepoRoot = path.resolve(webRoot, "../..");
const publicReleasesDir = path.join(webRoot, "public", "releases");

const ARTIFACT_GLOBS = [
  {
    id: "desktop-setup",
    dir: path.join(monorepoRoot, "apps", "desktop", "release"),
    prefix: "EliteFlow-Setup-",
    suffix: ".exe",
  },
  {
    id: "desktop-portable",
    dir: path.join(monorepoRoot, "apps", "desktop", "release"),
    prefix: "EliteFlow-Portable-",
    suffix: ".exe",
  },
  {
    id: "extension-zip",
    dir: path.join(monorepoRoot, "apps", "extension", "release"),
    prefix: "EliteFlow-Extension-",
    suffix: ".zip",
  },
];

function parseVersion(filename) {
  const match = filename.match(/(\d+\.\d+\.\d+)/);
  return match?.[1] ?? null;
}

function pickLatest(dir, prefix, suffix) {
  if (!fs.existsSync(dir)) return null;

  const matches = fs
    .readdirSync(dir)
    .filter((name) => name.startsWith(prefix) && name.endsWith(suffix))
    .map((name) => {
      const fullPath = path.join(dir, name);
      const stat = fs.statSync(fullPath);
      if (!stat.isFile()) return null;
      return { name, fullPath, size: stat.size, mtimeMs: stat.mtimeMs };
    })
    .filter(Boolean);

  if (matches.length === 0) return null;

  matches.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return matches[0];
}

function linkOrCopy(source, destination) {
  if (fs.existsSync(destination)) {
    try {
      const srcStat = fs.statSync(source);
      const destStat = fs.statSync(destination);
      if (srcStat.ino && destStat.ino && srcStat.ino === destStat.ino) {
        return "linked";
      }
      if (srcStat.size === destStat.size) {
        return "unchanged";
      }
    } catch {
      // continue
    }
    fs.rmSync(destination, { force: true });
  }

  try {
    fs.linkSync(source, destination);
    return "linked";
  } catch {
    fs.copyFileSync(source, destination);
    return "copied";
  }
}

function main() {
  fs.mkdirSync(publicReleasesDir, { recursive: true });

  const artifacts = [];

  for (const spec of ARTIFACT_GLOBS) {
    const found = pickLatest(spec.dir, spec.prefix, spec.suffix);
    if (!found) {
      console.warn(`[sync-releases] Missing: ${spec.prefix}*${spec.suffix} in ${spec.dir}`);
      continue;
    }

    const destination = path.join(publicReleasesDir, found.name);
    const action = linkOrCopy(found.fullPath, destination);
    const version = parseVersion(found.name);

    artifacts.push({
      id: spec.id,
      filename: found.name,
      version,
      sizeBytes: found.size,
      releasedAt: new Date(found.mtimeMs).toISOString(),
      href: `/releases/${found.name}`,
      sourcePath: path.relative(monorepoRoot, found.fullPath).replace(/\\/g, "/"),
      sync: action,
    });

    console.log(`[sync-releases] ${action.padEnd(9)} ${found.name}`);
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    artifacts,
  };

  fs.writeFileSync(
    path.join(publicReleasesDir, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );

  console.log(`[sync-releases] Wrote manifest (${artifacts.length} artifact(s))`);
}

main();
