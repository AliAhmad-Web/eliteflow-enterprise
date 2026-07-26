/**
 * Discover EliteFlow release artifacts, hardlink them into
 * apps/web/public/releases (no duplicate disk usage), and write manifest.json.
 * Production serves binaries as static CDN assets at /releases/*.
 *
 * Android APKs over ~100MB should set downloadUrl in
 * apps/mobile/release/build-info.json (e.g. Expo artifact or GitHub Releases)
 * so production downloads work without exceeding host file limits.
 *
 * On Vercel, monorepo release folders may be excluded — this script falls back
 * to existing public/releases binaries + prior manifest metadata.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, "..");
const monorepoRoot = path.resolve(webRoot, "../..");
const publicReleasesDir = path.join(webRoot, "public", "releases");
const manifestPath = path.join(publicReleasesDir, "manifest.json");

/** Skip copying oversized APKs into public/ (Vercel/Git ~100MB limits). */
const MAX_PUBLIC_COPY_BYTES = 95 * 1024 * 1024;

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
  {
    id: "android-apk",
    dir: path.join(monorepoRoot, "apps", "mobile", "release"),
    prefix: "EliteFlow-",
    suffix: ".apk",
  },
];

function parseVersion(filename) {
  const match = filename.match(/(\d+\.\d+\.\d+)/);
  return match?.[1] ?? null;
}

function parseVersionCode(filename) {
  const match = filename.match(/-vc(\d+)/i);
  if (!match?.[1]) return null;
  const value = Number.parseInt(match[1], 10);
  return Number.isFinite(value) ? value : null;
}

function isAndroidApkCandidate(name) {
  return (
    name.startsWith("EliteFlow-") &&
    name.endsWith(".apk") &&
    !name.includes("Setup") &&
    !name.includes("Portable") &&
    !name.includes("Extension")
  );
}

function pickLatest(dir, prefix, suffix, id) {
  if (!fs.existsSync(dir)) return null;

  const matches = fs
    .readdirSync(dir)
    .filter((name) => {
      if (id === "android-apk") return isAndroidApkCandidate(name);
      return name.startsWith(prefix) && name.endsWith(suffix);
    })
    .map((name) => {
      const fullPath = path.join(dir, name);
      try {
        const stat = fs.statSync(fullPath);
        if (!stat.isFile()) return null;
        return { name, fullPath, size: stat.size, mtimeMs: stat.mtimeMs };
      } catch {
        return null;
      }
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

function readAndroidBuildInfo(apkFilename) {
  const infoPath = path.join(
    monorepoRoot,
    "apps",
    "mobile",
    "release",
    "build-info.json",
  );
  if (!fs.existsSync(infoPath)) return null;
  try {
    const raw = JSON.parse(fs.readFileSync(infoPath, "utf8"));
    if (raw.filename && raw.filename !== apkFilename) return null;
    return raw;
  } catch {
    return null;
  }
}

function readExistingManifest() {
  if (!fs.existsSync(manifestPath)) return null;
  try {
    const raw = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    if (!Array.isArray(raw.artifacts)) return null;
    return raw;
  } catch {
    return null;
  }
}

function resolveAndroidHref(filename, androidInfo, previous) {
  const external =
    process.env.EXTERNAL_ANDROID_APK_URL?.trim() ||
    process.env.NEXT_PUBLIC_ANDROID_APK_URL?.trim() ||
    (typeof androidInfo?.downloadUrl === "string"
      ? androidInfo.downloadUrl.trim()
      : "") ||
    (typeof previous?.href === "string" && previous.href.startsWith("http")
      ? previous.href.trim()
      : "");
  if (external) return external;
  return `/releases/${filename}`;
}

function main() {
  fs.mkdirSync(publicReleasesDir, { recursive: true });

  const previousManifest = readExistingManifest();
  const previousById = new Map(
    (previousManifest?.artifacts ?? []).map((artifact) => [artifact.id, artifact]),
  );

  const artifacts = [];

  for (const spec of ARTIFACT_GLOBS) {
    const previous = previousById.get(spec.id) ?? null;
    const fromSource = pickLatest(spec.dir, spec.prefix, spec.suffix, spec.id);
    const fromPublic = pickLatest(
      publicReleasesDir,
      spec.prefix,
      spec.suffix,
      spec.id,
    );

    const found = fromSource ?? fromPublic;
    if (!found) {
      if (previous) {
        artifacts.push({ ...previous, sync: "preserved" });
        console.log(`[sync-releases] preserved ${previous.filename}`);
        continue;
      }
      console.warn(
        `[sync-releases] Missing: ${spec.prefix}*${spec.suffix} in ${spec.dir}`,
      );
      continue;
    }

    const androidInfo =
      spec.id === "android-apk" ? readAndroidBuildInfo(found.name) : null;
    const skipPublicCopy =
      spec.id === "android-apk" && found.size > MAX_PUBLIC_COPY_BYTES;

    let action = "metadata";
    let sourcePath = path
      .relative(monorepoRoot, found.fullPath)
      .replace(/\\/g, "/");

    if (fromSource && !skipPublicCopy) {
      const destination = path.join(publicReleasesDir, found.name);
      action = linkOrCopy(found.fullPath, destination);
    } else if (fromSource && skipPublicCopy) {
      console.warn(
        `[sync-releases] Skipping public copy for oversized APK (${found.size} bytes). Use downloadUrl / GitHub Releases.`,
      );
    } else {
      action = "public";
      sourcePath = path
        .join("apps", "web", "public", "releases", found.name)
        .replace(/\\/g, "/");
    }

    const version = androidInfo?.version ?? parseVersion(found.name);
    const versionCode =
      typeof androidInfo?.versionCode === "number"
        ? androidInfo.versionCode
        : parseVersionCode(found.name) ?? previous?.versionCode ?? null;

    artifacts.push({
      id: spec.id,
      filename: found.name,
      version,
      ...(spec.id === "android-apk" ? { versionCode } : {}),
      sizeBytes: found.size,
      releasedAt:
        androidInfo?.releasedAt ??
        previous?.releasedAt ??
        new Date(found.mtimeMs).toISOString(),
      href:
        spec.id === "android-apk"
          ? resolveAndroidHref(found.name, androidInfo, previous)
          : `/releases/${found.name}`,
      sourcePath,
      sync: action,
    });

    console.log(`[sync-releases] ${action.padEnd(9)} ${found.name}`);
  }

  // Keep any prior artifacts we do not know about (forward compatible).
  for (const previous of previousManifest?.artifacts ?? []) {
    if (!artifacts.some((artifact) => artifact.id === previous.id)) {
      artifacts.push({ ...previous, sync: "preserved" });
      console.log(`[sync-releases] preserved ${previous.filename}`);
    }
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    artifacts,
  };

  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  console.log(`[sync-releases] Wrote manifest (${artifacts.length} artifact(s))`);
}

main();
