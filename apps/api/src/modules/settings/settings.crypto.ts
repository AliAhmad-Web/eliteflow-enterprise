import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const ALGO = "aes-256-gcm";

function getKey(): Buffer {
  const raw =
    process.env.SETTINGS_ENCRYPTION_KEY?.trim() ||
    process.env.JWT_SECRET?.trim() ||
    "dev-only-settings-encryption-key-change-me";
  return createHash("sha256").update(raw).digest();
}

export function encryptSecret(plaintext: string): {
  encryptedSecret: string;
  iv: string;
  authTag: string;
  secretLast4: string;
} {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, getKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return {
    encryptedSecret: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
    secretLast4: plaintext.slice(-4),
  };
}

export function decryptSecret(input: {
  encryptedSecret: string;
  iv: string;
  authTag: string;
}): string {
  const decipher = createDecipheriv(
    ALGO,
    getKey(),
    Buffer.from(input.iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(input.authTag, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(input.encryptedSecret, "base64")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}
