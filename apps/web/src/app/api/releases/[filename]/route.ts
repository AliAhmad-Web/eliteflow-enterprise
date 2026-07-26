import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";

import { NextResponse } from "next/server";

import { discoverReleases } from "@/features/downloads/lib/discover-releases";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CONTENT_TYPES: Record<string, string> = {
  ".exe": "application/octet-stream",
  ".zip": "application/zip",
  ".apk": "application/vnd.android.package-archive",
};

function resolveMonorepoRoot(): string {
  const cwd = process.cwd();
  const candidates = [cwd, path.resolve(cwd, "../.."), path.resolve(cwd, "..")];

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

function isSafeFilename(filename: string): boolean {
  return (
    /^EliteFlow-[\w.-]+\.(exe|zip|apk)$/i.test(filename) &&
    !filename.includes("..") &&
    !filename.includes("/") &&
    !filename.includes("\\")
  );
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ filename: string }> },
) {
  const { filename: rawFilename } = await context.params;
  const filename = decodeURIComponent(rawFilename);

  if (!isSafeFilename(filename)) {
    return NextResponse.json({ error: "Invalid release filename." }, { status: 400 });
  }

  const catalog = discoverReleases();
  const allowed = [
    catalog.desktop.setup,
    catalog.desktop.portable,
    catalog.extension.zip,
    catalog.android.apk,
  ].filter(Boolean);

  const artifact = allowed.find((item) => item?.filename === filename);
  if (!artifact) {
    return NextResponse.json({ error: "Release artifact not found." }, { status: 404 });
  }

  // External CDN / GitHub Releases — redirect instead of streaming locally.
  if (artifact.href.startsWith("http")) {
    return NextResponse.redirect(artifact.href, 302);
  }

  const monorepoRoot = resolveMonorepoRoot();
  const sourcePath = artifact.sourcePath
    ? path.join(monorepoRoot, artifact.sourcePath)
    : null;

  const candidates = [
    sourcePath,
    path.join(monorepoRoot, "apps", "desktop", "release", filename),
    path.join(monorepoRoot, "apps", "extension", "release", filename),
    path.join(monorepoRoot, "apps", "mobile", "release", filename),
    path.join(process.cwd(), "public", "releases", filename),
  ].filter((entry): entry is string => Boolean(entry));

  const filePath = candidates.find((candidate) => fs.existsSync(candidate));
  if (!filePath) {
    return NextResponse.json(
      { error: "Release file is not available on this server." },
      { status: 404 },
    );
  }

  const stat = fs.statSync(filePath);
  const extension = path.extname(filename).toLowerCase();
  const contentType = CONTENT_TYPES[extension] ?? "application/octet-stream";
  const nodeStream = fs.createReadStream(filePath);
  const webStream = Readable.toWeb(nodeStream) as unknown as ReadableStream;

  return new NextResponse(webStream, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(stat.size),
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "public, max-age=3600, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
