import { encryptionService } from "../../shared/security/encryption.service.js";

/**
 * Integration / settings credential helpers.
 * Delegates to the enterprise EncryptionService (no standalone crypto).
 */
export function encryptSecret(plaintext: string): {
  encryptedSecret: string;
  iv: string;
  authTag: string;
  secretLast4: string;
} {
  const parts = encryptionService.encryptToParts(plaintext);
  return {
    encryptedSecret: parts.ciphertext,
    iv: parts.iv,
    authTag: parts.authTag,
    secretLast4: plaintext.slice(-4),
  };
}

export function decryptSecret(input: {
  encryptedSecret: string;
  iv: string;
  authTag: string;
}): string {
  // New columnar rows use raw GCM parts via EncryptionService.
  // Also accept a versioned blob mistakenly stored in encryptedSecret.
  if (encryptionService.isEncrypted(input.encryptedSecret)) {
    return encryptionService.decrypt(input.encryptedSecret);
  }
  return encryptionService.decryptFromParts({
    ciphertext: input.encryptedSecret,
    iv: input.iv,
    authTag: input.authTag,
  });
}
