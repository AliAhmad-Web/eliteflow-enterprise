import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const sourceCandidates = [
  join(root, "../desktop/resources/icon.png"),
  join(root, "../../apps/desktop/resources/icon.png"),
];

const source = sourceCandidates.find((path) => existsSync(path));
if (!source) {
  console.error("EliteFlow icon source not found (apps/desktop/resources/icon.png)");
  process.exit(1);
}

const outDir = join(root, "public/icons");
mkdirSync(outDir, { recursive: true });

const sizes = [16, 32, 48, 128];

for (const size of sizes) {
  const out = join(outDir, `icon-${size}.png`);
  await sharp(source).resize(size, size).png().toFile(out);
  console.log(`Wrote ${out}`);
}

// Keep a copy for docs/reference
copyFileSync(join(outDir, "icon-128.png"), join(outDir, "icon.png"));
