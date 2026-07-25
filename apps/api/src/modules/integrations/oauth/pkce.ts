import { createHash, randomBytes } from "node:crypto";

/**
 * PKCE (RFC 7636) — required by OAuth 2.0 Security BCP (RFC 9700)
 * even for confidential server clients.
 */
export function createPkcePair(): {
  codeVerifier: string;
  codeChallenge: string;
} {
  const codeVerifier = randomBytes(32).toString("base64url");
  const codeChallenge = createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");
  return { codeVerifier, codeChallenge };
}
