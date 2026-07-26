import fs from "node:fs";
import path from "node:path";

export type ReleaseArtifactId =
  | "desktop-setup"
  | "desktop-portable"
  | "extension-zip"
  | "android-apk";

export interface ReleaseArtifact {
  id: ReleaseArtifactId;
  filename: string;
  version: string | null;
  versionCode?: number | null;
  sizeBytes: number;
  releasedAt: string;
  href: string;
  sourcePath?: string;
}

export interface ReleaseCatalog {
  generatedAt: string | null;
  desktop: {
    version: string | null;
    setup: ReleaseArtifact | null;
    portable: ReleaseArtifact | null;
  };
  extension: {
    version: string | null;
    zip: ReleaseArtifact | null;
  };
  android: {
    available: boolean;
    status: "available" | "coming-soon";
    version: string | null;
    versionCode: number | null;
    apk: ReleaseArtifact | null;
  };
}

const ARTIFACT_SPECS: Array<{
  id: ReleaseArtifactId;
  dirSegments: string[];
  prefix: string;
  suffix: string;
}> = [
  {
    id: "desktop-setup",
    dirSegments: ["apps", "desktop", "release"],
    prefix: "EliteFlow-Setup-",
    suffix: ".exe",
  },
  {
    id: "desktop-portable",
    dirSegments: ["apps", "desktop", "release"],
    prefix: "EliteFlow-Portable-",
    suffix: ".exe",
  },
  {
    id: "extension-zip",
    dirSegments: ["apps", "extension", "release"],
    prefix: "EliteFlow-Extension-",
    suffix: ".zip",
  },
  {
    id: "android-apk",
    dirSegments: ["apps", "mobile", "release"],
    prefix: "EliteFlow-",
    suffix: ".apk",
  },
];

function resolveMonorepoRoot(): string {
  const cwd = process.cwd();
  const candidates = [
    cwd,
    path.resolve(cwd, "../.."),
    path.resolve(cwd, ".."),
  ];

  for (const candidate of candidates) {
    if (
      fs.existsSync(path.join(candidate, "apps", "desktop")) &&
      fs.existsSync(path.join(candidate, "apps", "extension"))
    ) {
      return candidate;
    }
  }

  return path.resolve(cwd, "../..");
}

function parseVersion(filename: string): string | null {
  const match = filename.match(/(\d+\.\d+\.\d+)/);
  return match?.[1] ?? null;
}

function parseVersionCode(filename: string): number | null {
  const match = filename.match(/-vc(\d+)/i);
  if (!match?.[1]) return null;
  const value = Number.parseInt(match[1], 10);
  return Number.isFinite(value) ? value : null;
}

function toDownloadHref(filename: string): string {
  return `/releases/${filename}`;
}

function isAndroidApkCandidate(name: string): boolean {
  return (
    name.startsWith("EliteFlow-") &&
    name.endsWith(".apk") &&
    !name.includes("Setup") &&
    !name.includes("Portable") &&
    !name.includes("Extension")
  );
}

function pickLatest(
  dir: string,
  prefix: string,
  suffix: string,
  id?: ReleaseArtifactId,
): { name: string; fullPath: string; size: number; mtimeMs: number } | null {
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
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  if (matches.length === 0) return null;

  matches.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return matches[0] ?? null;
}

function readAndroidBuildInfo(
  monorepoRoot: string,
  apkFilename: string,
): {
  versionCode: number | null;
  releasedAt: string | null;
  version: string | null;
  downloadUrl: string | null;
} {
  const infoPath = path.join(
    monorepoRoot,
    "apps",
    "mobile",
    "release",
    "build-info.json",
  );
  if (!fs.existsSync(infoPath)) {
    return {
      versionCode: parseVersionCode(apkFilename),
      releasedAt: null,
      version: parseVersion(apkFilename),
      downloadUrl: null,
    };
  }

  try {
    const raw = JSON.parse(fs.readFileSync(infoPath, "utf8")) as {
      filename?: string;
      version?: string;
      versionCode?: number;
      releasedAt?: string;
      downloadUrl?: string;
    };
    if (raw.filename && raw.filename !== apkFilename) {
      return {
        versionCode: parseVersionCode(apkFilename),
        releasedAt: null,
        version: parseVersion(apkFilename),
        downloadUrl: null,
      };
    }
    return {
      versionCode:
        typeof raw.versionCode === "number"
          ? raw.versionCode
          : parseVersionCode(apkFilename),
      releasedAt: raw.releasedAt ?? null,
      version: raw.version ?? parseVersion(apkFilename),
      downloadUrl:
        typeof raw.downloadUrl === "string" && raw.downloadUrl.trim()
          ? raw.downloadUrl.trim()
          : null,
    };
  } catch {
    return {
      versionCode: parseVersionCode(apkFilename),
      releasedAt: null,
      version: parseVersion(apkFilename),
      downloadUrl: null,
    };
  }
}

function normalizeArtifact(artifact: ReleaseArtifact): ReleaseArtifact {
  return {
    ...artifact,
    href: artifact.href.startsWith("http")
      ? artifact.href
      : toDownloadHref(artifact.filename),
    versionCode:
      artifact.versionCode ??
      (artifact.id === "android-apk"
        ? parseVersionCode(artifact.filename)
        : null),
  };
}

function readManifest(
  publicReleasesDir: string,
): { generatedAt: string | null; artifacts: ReleaseArtifact[] } | null {
  const manifestPath = path.join(publicReleasesDir, "manifest.json");
  if (!fs.existsSync(manifestPath)) return null;

  try {
    const raw = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as {
      generatedAt?: string;
      artifacts?: ReleaseArtifact[];
    };
    if (!Array.isArray(raw.artifacts) || raw.artifacts.length === 0) return null;
    return {
      generatedAt: raw.generatedAt ?? null,
      artifacts: raw.artifacts.map(normalizeArtifact),
    };
  } catch {
    return null;
  }
}

function discoverFromDisk(monorepoRoot: string): ReleaseArtifact[] {
  const artifacts: ReleaseArtifact[] = [];

  for (const spec of ARTIFACT_SPECS) {
    const dir = path.join(monorepoRoot, ...spec.dirSegments);
    const found = pickLatest(dir, spec.prefix, spec.suffix, spec.id);
    if (!found) continue;

    const androidInfo =
      spec.id === "android-apk"
        ? readAndroidBuildInfo(monorepoRoot, found.name)
        : null;

    artifacts.push({
      id: spec.id,
      filename: found.name,
      version: androidInfo?.version ?? parseVersion(found.name),
      versionCode: androidInfo?.versionCode ?? null,
      sizeBytes: found.size,
      releasedAt:
        androidInfo?.releasedAt ?? new Date(found.mtimeMs).toISOString(),
      href:
        androidInfo?.downloadUrl ??
        toDownloadHref(found.name),
      sourcePath: path
        .relative(monorepoRoot, found.fullPath)
        .replace(/\\/g, "/"),
    });
  }

  return artifacts;
}

function discoverFromPublic(
  publicReleasesDir: string,
  monorepoRoot: string,
): ReleaseArtifact[] {
  if (!fs.existsSync(publicReleasesDir)) return [];

  const artifacts: ReleaseArtifact[] = [];

  for (const spec of ARTIFACT_SPECS) {
    const found = pickLatest(publicReleasesDir, spec.prefix, spec.suffix, spec.id);
    if (!found) continue;

    const androidInfo =
      spec.id === "android-apk"
        ? readAndroidBuildInfo(monorepoRoot, found.name)
        : null;

    artifacts.push({
      id: spec.id,
      filename: found.name,
      version: androidInfo?.version ?? parseVersion(found.name),
      versionCode: androidInfo?.versionCode ?? null,
      sizeBytes: found.size,
      releasedAt:
        androidInfo?.releasedAt ?? new Date(found.mtimeMs).toISOString(),
      href:
        androidInfo?.downloadUrl ??
        toDownloadHref(found.name),
      sourcePath: path
        .join("apps", "web", "public", "releases", found.name)
        .replace(/\\/g, "/"),
    });
  }

  return artifacts;
}

function mergeArtifacts(
  preferred: ReleaseArtifact[],
  fallback: ReleaseArtifact[],
): ReleaseArtifact[] {
  const byId = new Map<ReleaseArtifactId, ReleaseArtifact>();
  for (const artifact of fallback) byId.set(artifact.id, artifact);
  for (const artifact of preferred) byId.set(artifact.id, artifact);
  return Array.from(byId.values());
}

function byId(
  artifacts: ReleaseArtifact[],
  id: ReleaseArtifactId,
): ReleaseArtifact | null {
  return artifacts.find((artifact) => artifact.id === id) ?? null;
}

/**
 * Automatically detect Desktop + Chrome Extension + Android release artifacts.
 * Prefers public/releases binaries (production CDN), then monorepo release
 * folders, then manifest.json metadata (including external hrefs).
 */
export function discoverReleases(): ReleaseCatalog {
  const monorepoRoot = resolveMonorepoRoot();
  const publicReleasesDir = path.join(process.cwd(), "public", "releases");

  const manifest = readManifest(publicReleasesDir);
  const publicArtifacts = discoverFromPublic(publicReleasesDir, monorepoRoot);
  const diskArtifacts = discoverFromDisk(monorepoRoot);

  const discovered = mergeArtifacts(publicArtifacts, diskArtifacts);
  const artifacts =
    discovered.length > 0
      ? mergeArtifacts(discovered, manifest?.artifacts ?? [])
      : (manifest?.artifacts ?? []);

  const setup = byId(artifacts, "desktop-setup");
  const portable = byId(artifacts, "desktop-portable");
  const zip = byId(artifacts, "extension-zip");
  const apk = byId(artifacts, "android-apk");

  return {
    generatedAt: manifest?.generatedAt ?? new Date().toISOString(),
    desktop: {
      version: setup?.version ?? portable?.version ?? null,
      setup,
      portable,
    },
    extension: {
      version: zip?.version ?? null,
      zip,
    },
    android: apk
      ? {
          available: true,
          status: "available",
          version: apk.version,
          versionCode: apk.versionCode ?? parseVersionCode(apk.filename),
          apk,
        }
      : {
          available: false,
          status: "coming-soon",
          version: null,
          versionCode: null,
          apk: null,
        },
  };
}
