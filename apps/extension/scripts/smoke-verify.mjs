import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const dist = join(root, "dist");
const release = join(root, "release");

const checks = [];

function pass(name, detail = "") {
  checks.push({ name, ok: true, detail });
}

function fail(name, detail = "") {
  checks.push({ name, ok: false, detail });
}

function assert(name, condition, detail = "") {
  if (condition) pass(name, detail);
  else fail(name, detail);
}

const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
assert("Package identity", pkg.name === "@enterprise/extension", pkg.name);
assert("Version is 1.0.0", pkg.version === "1.0.0", pkg.version);

assert("dist/ exists", existsSync(dist));
assert(
  "manifest.json in dist",
  existsSync(join(dist, "manifest.json")),
);

if (existsSync(join(dist, "manifest.json"))) {
  const manifest = JSON.parse(readFileSync(join(dist, "manifest.json"), "utf8"));
  assert("Manifest V3", manifest.manifest_version === 3);
  assert("Background service worker", Boolean(manifest.background?.service_worker));
  assert("Popup action", Boolean(manifest.action?.default_popup));
  assert(
    "Least-privilege permissions",
    Array.isArray(manifest.permissions) &&
      !manifest.permissions.includes("<all_urls>") &&
      !manifest.permissions.includes("webRequest"),
  );
  assert(
    "Host permission for Railway API",
    (manifest.host_permissions ?? []).some((p) =>
      String(p).includes("api-production-a778.up.railway.app"),
    ),
  );
  assert(
    "No unsafe eval CSP",
    !String(manifest.content_security_policy?.extension_pages ?? "").includes(
      "unsafe-eval",
    ),
  );
}

assert(
  "Service worker bundle",
  existsSync(join(dist, "background/service-worker.js")),
);

const popupHtmlCandidates = [
  join(dist, "src/popup/index.html"),
  join(dist, "popup/index.html"),
  join(dist, "index.html"),
];
const popupHtml = popupHtmlCandidates.find((p) => existsSync(p));
assert("Popup HTML built", Boolean(popupHtml), popupHtml ?? "missing");

assert("Icon 16", existsSync(join(dist, "icons/icon-16.png")));
assert("Icon 48", existsSync(join(dist, "icons/icon-48.png")));
assert("Icon 128", existsSync(join(dist, "icons/icon-128.png")));

const zipPath = join(release, `EliteFlow-Extension-${pkg.version}.zip`);
assert("Production ZIP", existsSync(zipPath), zipPath);
if (existsSync(zipPath)) {
  assert("ZIP non-empty", statSync(zipPath).size > 1000, `${statSync(zipPath).size} bytes`);
}

const sourceFiles = [
  "src/shared/api/api-client.ts",
  "src/shared/auth/storage.ts",
  "src/background/service-worker.ts",
  "src/popup/App.tsx",
];
for (const file of sourceFiles) {
  assert(`Source ${file}`, existsSync(join(root, file)));
}

const apiHealth = await fetch(
  "https://api-production-a778.up.railway.app/api/v1/health",
).catch((error) => {
  fail("Railway API health", String(error?.message ?? error));
  return null;
});

if (apiHealth) {
  if (apiHealth.ok) {
    const body = await apiHealth.json().catch(() => null);
    assert(
      "Railway API health",
      body?.status === "ok" || body?.data?.status === "ok" || apiHealth.status === 200,
      JSON.stringify(body),
    );
  } else {
    fail("Railway API health", `status=${apiHealth.status}`);
  }
}

const failed = checks.filter((c) => !c.ok);
for (const check of checks) {
  const mark = check.ok ? "✔" : "✖";
  console.log(`${mark} ${check.name}${check.detail ? ` — ${check.detail}` : ""}`);
}

console.log(
  `Smoke result: ${checks.length - failed.length}/${checks.length} passed`,
);

if (failed.length) {
  process.exit(1);
}
