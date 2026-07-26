#!/usr/bin/env node
/**
 * Smoke verification for EliteFlow Desktop packaging + connectivity.
 * Does not launch a GUI; validates artifacts, config, and API reachability.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const pkg = JSON.parse(
  fs.readFileSync(path.join(root, "package.json"), "utf8"),
);

const PRODUCTION_API = "https://api-production-a778.up.railway.app";
const PRODUCTION_WEB = "https://eliteflow-web.vercel.app";
const checks = [];

function pass(name, detail = "") {
  checks.push({ name, ok: true, detail });
  console.log(`✔ ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name, detail = "") {
  checks.push({ name, ok: false, detail });
  console.error(`✘ ${name}${detail ? ` — ${detail}` : ""}`);
}

function readAllJs(dir) {
  if (!fs.existsSync(dir)) return "";
  const parts = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      parts.push(readAllJs(full));
    } else if (entry.name.endsWith(".js")) {
      parts.push(fs.readFileSync(full, "utf8"));
    }
  }
  return parts.join("\n");
}

if (pkg.name === "@enterprise/desktop" && pkg.version) {
  pass("Package identity", `${pkg.name}@${pkg.version}`);
} else {
  fail("Package identity");
}

const mainJs = path.join(root, "dist", "main", "index.js");
const preloadJs = path.join(root, "dist", "preload", "index.js");
if (fs.existsSync(mainJs)) pass("Main process build", mainJs);
else fail("Main process build", "run npm run build");
if (fs.existsSync(preloadJs)) pass("Preload build", preloadJs);
else fail("Preload build", "run npm run build");

if (fs.existsSync(preloadJs)) {
  const src = fs.readFileSync(preloadJs, "utf8");
  if (src.includes("contextBridge") && src.includes("eliteflowDesktop")) {
    pass("Preload contextBridge");
  } else {
    fail("Preload contextBridge");
  }
}

const compiledMain = readAllJs(path.join(root, "dist", "main"));
const securityChecks = [
  ["nodeIntegration: false", "nodeIntegration disabled"],
  ["contextIsolation: true", "contextIsolation enabled"],
  ["persist:eliteflow", "session persistence partition"],
];
for (const [needle, label] of securityChecks) {
  if (compiledMain.includes(needle)) pass(label);
  else fail(label, `missing marker ${needle}`);
}

const releaseDir = path.join(root, "release");
if (fs.existsSync(releaseDir)) {
  const files = fs.readdirSync(releaseDir);
  const anyExe = files.filter((f) => f.endsWith(".exe"));
  if (anyExe.length) pass("Windows EXE artifact(s)", anyExe.join(", "));
  else fail("Windows EXE artifact(s)", "run npm run dist");
  if (anyExe.some((f) => /portable/i.test(f))) pass("Portable build present");
  else fail("Portable build present", "expected *Portable*.exe");
  if (anyExe.some((f) => /setup/i.test(f))) pass("NSIS installer present");
  else fail("NSIS installer present", "expected *Setup*.exe");
} else {
  fail("release/ directory", "run npm run dist to produce installers");
}

async function probe(url, label) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (res.ok) {
      const body = await res.text();
      pass(label, `${res.status} ${body.slice(0, 100).replace(/\s+/g, " ")}`);
    } else {
      pass(label, `HTTP ${res.status}`);
    }
  } catch (error) {
    clearTimeout(timer);
    fail(label, error instanceof Error ? error.message : String(error));
  }
}

await probe(`${PRODUCTION_API}/api/v1/health`, "Railway API health");
await probe(PRODUCTION_WEB, "Production web reachability");

const failed = checks.filter((c) => !c.ok);
console.log("");
console.log(
  `Smoke result: ${checks.length - failed.length}/${checks.length} passed`,
);
process.exit(failed.length ? 1 : 0);
