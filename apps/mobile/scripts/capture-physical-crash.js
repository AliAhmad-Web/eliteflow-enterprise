/**
 * Wait for a physical Android device and capture EliteFlow cold-start logcat.
 *
 * Usage:
 *   node scripts/capture-physical-crash.js [path-to.apk]
 *
 * Connect the phone with USB debugging enabled. Emulators are ignored.
 */
const { spawn, execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const PKG = "com.eliteflow.mobile";
const ADB_CANDIDATES = [
  process.env.ANDROID_HOME
    ? path.join(process.env.ANDROID_HOME, "platform-tools", "adb.exe")
    : "",
  "D:\\Android\\Sdk\\platform-tools\\adb.exe",
  path.join(ROOT, "../../tools/platform-tools/adb.exe"),
  "adb",
].filter(Boolean);

function findAdb() {
  for (const c of ADB_CANDIDATES) {
    try {
      if (c === "adb" || fs.existsSync(c)) {
        execFileSync(c, ["version"], { stdio: "pipe" });
        return c;
      }
    } catch {}
  }
  throw new Error("adb not found");
}

function adb(adbPath, args) {
  return execFileSync(adbPath, args, { encoding: "utf8" });
}

function physicalDevices(adbPath) {
  return adb(adbPath, ["devices", "-l"])
    .split(/\r?\n/)
    .filter((l) => /\tdevice/.test(l) && !/emulator-/.test(l))
    .map((l) => l.split(/\s+/)[0]);
}

function main() {
  const apk =
    process.argv[2] ||
    "D:\\eliteflow-apk-verify\\EliteFlow-v14-production.apk";
  const adbPath = findAdb();
  console.log("Waiting for physical Android device (USB debugging)...");

  let serial = null;
  for (let i = 0; i < 120; i++) {
    const devices = physicalDevices(adbPath);
    if (devices.length) {
      serial = devices[0];
      console.log("Found device:", serial);
      break;
    }
    if (i % 5 === 0) console.log(`… still waiting (${i * 5}s)`);
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 5000);
  }
  if (!serial) throw new Error("No physical device connected within 10 minutes");

  const outDir = path.join(ROOT, ".tmp-apk");
  fs.mkdirSync(outDir, { recursive: true });
  const logPath = path.join(outDir, `logcat-physical-${Date.now()}.txt`);

  try {
    adb(adbPath, ["-s", serial, "uninstall", PKG]);
  } catch {}
  console.log("Installing", apk);
  adb(adbPath, ["-s", serial, "install", "-r", apk]);
  adb(adbPath, ["-s", serial, "logcat", "-c"]);

  const log = fs.createWriteStream(logPath);
  const child = spawn(
    adbPath,
    ["-s", serial, "logcat", "-v", "threadtime", "*:V"],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  child.stdout.pipe(log);
  child.stderr.pipe(log);

  console.log("Launching app…");
  adb(adbPath, [
    "-s",
    serial,
    "shell",
    "am",
    "start",
    "-n",
    `${PKG}/.MainActivity`,
  ]);

  setTimeout(() => {
    let pid = "";
    try {
      pid = adb(adbPath, ["-s", serial, "shell", "pidof", PKG]).trim();
    } catch {}
    console.log("pidof=", pid || "(dead)");
    console.log("log=", logPath);
    child.kill();
    process.exit(pid ? 0 : 2);
  }, 15000);
}

main();
