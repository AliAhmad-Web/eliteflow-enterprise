/**
 * Reproduce EliteFlow Android startup crash and capture logcat.
 *
 * Usage (device or emulator connected):
 *   node scripts/capture-android-crash.js [path-to.apk]
 */
const { spawn, execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const ADB_CANDIDATES = [
  path.join(ROOT, "../../tools/platform-tools/adb.exe"),
  path.join(process.env.LOCALAPPDATA || "", "Android/Sdk/platform-tools/adb.exe"),
  "adb",
];

const PKG = "com.eliteflow.mobile";
const DEFAULT_APK = path.join(ROOT, ".tmp-apk/eliteflow-v10.apk");

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

function adb(adbPath, args, opts = {}) {
  return execFileSync(adbPath, args, {
    encoding: "utf8",
    stdio: opts.stdio || "pipe",
    ...opts,
  });
}

function main() {
  const apk = process.argv[2] || DEFAULT_APK;
  const adbPath = findAdb();
  const devices = adb(adbPath, ["devices"])
    .split("\n")
    .filter((l) => /\tdevice$/.test(l));
  if (!devices.length) {
    throw new Error("No Android device/emulator online (adb devices empty)");
  }

  const outDir = path.join(ROOT, ".tmp-apk");
  fs.mkdirSync(outDir, { recursive: true });
  const logPath = path.join(outDir, `logcat-crash-${Date.now()}.txt`);

  console.log("Installing", apk);
  try {
    adb(adbPath, ["uninstall", PKG]);
  } catch {}
  adb(adbPath, ["install", "-r", apk], { stdio: "inherit" });

  console.log("Clearing logcat…");
  adb(adbPath, ["logcat", "-c"]);

  const log = fs.createWriteStream(logPath);
  const child = spawn(
    adbPath,
    [
      "logcat",
      "-v",
      "threadtime",
      "*:S",
      "AndroidRuntime:E",
      "ReactNative:V",
      "ReactNativeJS:V",
      "Expo:V",
      "expo.modules:V",
      "expo.modules.updates:V",
      "libc:E",
      "DEBUG:E",
      "ActivityManager:I",
    ],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  child.stdout.pipe(log);
  child.stderr.pipe(log);

  console.log("Launching", PKG);
  adb(adbPath, [
    "shell",
    "am",
    "start",
    "-n",
    `${PKG}/.MainActivity`,
  ]);

  setTimeout(() => {
    child.kill();
    log.end();
    const text = fs.readFileSync(logPath, "utf8");
    const needles = [
      "FATAL EXCEPTION",
      "AndroidRuntime",
      "Reanimated",
      "No launchable update",
      "ReactNativeJS",
      "Invariant Violation",
      "expo.modules.updates",
    ];
    console.log("\n=== Crash log saved:", logPath, "===\n");
    for (const n of needles) {
      const hit = text.includes(n);
      console.log(`${hit ? "HIT " : "miss"} ${n}`);
    }
    const lines = text
      .split("\n")
      .filter((l) =>
        /FATAL|AndroidRuntime|Reanimated|ReactNativeJS|updates|Exception|Error/i.test(
          l,
        ),
      )
      .slice(0, 80);
    console.log(lines.join("\n"));
  }, 8000);
}

main();
