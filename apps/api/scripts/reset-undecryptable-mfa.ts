/**
 * One-time: clear MFA for users whose TOTP secrets cannot be decrypted
 * with the current ENTERPRISE_ENCRYPTION_KEY (host migration key mismatch).
 *
 *   npx tsx --env-file=apps/api/.env apps/api/scripts/reset-undecryptable-mfa.ts
 */
import { createDecipheriv, createHash } from "node:crypto";

import { prisma } from "@enterprise/database";

function clean(s: string | undefined) {
  return (s || "").replace(/^\uFEFF/, "").trim();
}

function derive(raw: string | undefined) {
  const t = clean(raw);
  try {
    const b = Buffer.from(t, "base64");
    if (b.length === 32) return b;
  } catch {
    // ignore
  }
  return createHash("sha256").update(t, "utf8").digest();
}

function canDecrypt(secret: string, key: Buffer): boolean {
  try {
    const parts = secret.split(":");
    if (parts.length < 6 || parts[0] !== "efenc") return false;
    const d = createDecipheriv(
      "aes-256-gcm",
      key,
      Buffer.from(parts[3]!, "base64"),
    );
    d.setAuthTag(Buffer.from(parts[4]!, "base64"));
    d.update(Buffer.from(parts[5]!, "base64"));
    d.final();
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const key = derive(process.env.ENTERPRISE_ENCRYPTION_KEY);
  if (!clean(process.env.ENTERPRISE_ENCRYPTION_KEY)) {
    throw new Error("ENTERPRISE_ENCRYPTION_KEY is required");
  }

  const users = await prisma.user.findMany({
    where: {
      deletedAt: null,
      OR: [
        { twoFactorEnabled: true },
        { twoFactorSecret: { not: null } },
      ],
    },
    select: {
      id: true,
      email: true,
      twoFactorEnabled: true,
      twoFactorSecret: true,
    },
  });

  let reset = 0;
  let ok = 0;
  for (const user of users) {
    const secret = user.twoFactorSecret;
    if (!secret) {
      if (user.twoFactorEnabled) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            twoFactorEnabled: false,
            twoFactorSecret: null,
            twoFactorLastStep: null,
            recoveryCodes: [],
            mfaEnrollmentRequired: true,
          },
        });
        reset += 1;
        console.log(
          `reset_flag_only hash=${createHash("sha256").update(user.email).digest("hex").slice(0, 8)}`,
        );
      }
      continue;
    }

    if (canDecrypt(secret, key)) {
      ok += 1;
      continue;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorLastStep: null,
        recoveryCodes: [],
        mfaEnrollmentRequired: true,
      },
    });
    reset += 1;
    console.log(
      `reset_undecryptable hash=${createHash("sha256").update(user.email).digest("hex").slice(0, 8)}`,
    );
  }

  console.log(JSON.stringify({ scanned: users.length, decryptOk: ok, reset }));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
