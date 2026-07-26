import fs from "node:fs";
import path from "node:path";

export type ReleaseArtifactId =
  | "desktop-setup"
  | "desktop-portable"
  | "extension-zip";

export interface ReleaseArtifact {
  id: ReleaseArtifactId;
  filename: string;
  version: string | null;
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
    available: false;
    status: "coming-soon";
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

function toDownloadHref(filename: string): string {
  return `/releases/${filename}`;
}

function pickLatest(
  dir: string,
  prefix: string,
  suffix: string,
): { name: string; fullPath: string; size: number; mtimeMs: number } | null {
  if (!fs.existsSync(dir)) return null;

  const matches = fs
    .readdirSync(dir)
    .filter((name) => name.startsWith(prefix) && name.endsWith(suffix))
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

function normalizeArtifact(artifact: ReleaseArtifact): ReleaseArtifact {
  return {
    ...artifact,
    href: toDownloadHref(artifact.filename),
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
    const found = pickLatest(dir, spec.prefix, spec.suffix);
    if (!found) continue;

    artifacts.push({
      id: spec.id,
      filename: found.name,
      version: parseVersion(found.name),
      sizeBytes: found.size,
      releasedAt: new Date(found.mtimeMs).toISOString(),
      href: toDownloadHref(found.name),
      sourcePath: path
        .relative(monorepoRoot, found.fullPath)
        .replace(/\\/g, "/"),
    });
  }

  return artifacts;
}

function discoverFromPublic(
  publicReleasesDir: string,
): ReleaseArtifact[] {
  if (!fs.existsSync(publicReleasesDir)) return [];

  const artifacts: ReleaseArtifact[] = [];

  for (const spec of ARTIFACT_SPECS) {
    const found = pickLatest(publicReleasesDir, spec.prefix, spec.suffix);
    if (!found) continue;

    artifacts.push({
      id: spec.id,
      filename: found.name,
      version: parseVersion(found.name),
      sizeBytes: found.size,
      releasedAt: new Date(found.mtimeMs).toISOString(),
      href: toDownloadHref(found.name),
      sourcePath: path
        .join("apps", "web", "public", "releases", found.name)
        .replace(/\\/g, "/"),
    });
  }

  return artifacts;
}

function byId(
  artifacts: ReleaseArtifact[],
  id: ReleaseArtifactId,
): ReleaseArtifact | null {
  return artifacts.find((artifact) => artifact.id === id) ?? null;
}

/**
 * Automatically detect Desktop + Chrome Extension release artifacts.
 * Prefers public/releases binaries (production CDN), then monorepo release
 * folders, then manifest.json metadata.
 */
export function discoverReleases(): ReleaseCatalog {
  const monorepoRoot = resolveMonorepoRoot();
  const publicReleasesDir = path.join(process.cwd(), "public", "releases");

  const manifest = readManifest(publicReleasesDir);
  const publicArtifacts = discoverFromPublic(publicReleasesDir);
  const diskArtifacts = discoverFromDisk(monorepoRoot);
  const artifacts =
    publicArtifacts.length > 0
      ? publicArtifacts
      : diskArtifacts.length > 0
        ? diskArtifacts
        : (manifest?.artifacts ?? []);

  const setup = byId(artifacts, "desktop-setup");
  const portable = byId(artifacts, "desktop-portable");
  const zip = byId(artifacts, "extension-zip");

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
    android: {
      available: false,
      status: "coming-soon",
    },
  };
}
