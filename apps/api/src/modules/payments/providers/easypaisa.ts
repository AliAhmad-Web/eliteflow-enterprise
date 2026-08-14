import {
  createCipheriv,
  createHmac,
  timingSafeEqual,
} from "node:crypto";

export const EASYPAISA_SANDBOX_URL =
  "https://easypaystg.easypaisa.com.pk/easypay/Index.jsf";
export const EASYPAISA_PRODUCTION_URL =
  "https://easypay.easypaisa.com.pk/easypay/Index.jsf";

export interface EasyPaisaCredentials {
  storeId: string;
  hashKey: string;
  sandbox: boolean;
  algorithm: "aes-128-ecb" | "hmac-sha256";
}

export function getEasyPaisaCredentials(): EasyPaisaCredentials | null {
  const storeId = process.env.EASYPAISA_STORE_ID?.trim();
  const hashKey = process.env.EASYPAISA_HASH_KEY?.trim();
  if (!storeId || !hashKey) {
    return null;
  }
  const algorithm =
    process.env.EASYPAISA_HASH_ALGO?.trim().toLowerCase() === "hmac-sha256"
      ? "hmac-sha256"
      : "aes-128-ecb";
  return {
    storeId,
    hashKey,
    sandbox: process.env.EASYPAISA_SANDBOX !== "false",
    algorithm,
  };
}

export function easyPaisaHostedUrl(sandbox: boolean): string {
  return sandbox ? EASYPAISA_SANDBOX_URL : EASYPAISA_PRODUCTION_URL;
}

export function formatEasyPaisaAmount(amount: number): string {
  return amount.toFixed(2);
}

function aes128EcbHex(plaintext: string, hashKey: string): string {
  const key = Buffer.alloc(16);
  Buffer.from(hashKey, "utf8").copy(key);
  const cipher = createCipheriv("aes-128-ecb", key, null);
  cipher.setAutoPadding(true);
  return Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]).toString("hex");
}

/**
 * Official EasyPay concat order for merchantHashedReq:
 * amount=&autoRedirect=&emailAddr=&mobileNum=&orderRefNum=&paymentMethod=&postBackURL=&storeId=
 */
export function buildEasyPaisaHashString(fields: {
  amount: string;
  autoRedirect?: string;
  emailAddr?: string;
  mobileNum?: string;
  orderRefNum: string;
  paymentMethod?: string;
  postBackURL: string;
  storeId: string;
}): string {
  return `amount=${fields.amount}&autoRedirect=${fields.autoRedirect ?? "1"}&emailAddr=${fields.emailAddr ?? ""}&mobileNum=${fields.mobileNum ?? ""}&orderRefNum=${fields.orderRefNum}&paymentMethod=${fields.paymentMethod ?? ""}&postBackURL=${fields.postBackURL}&storeId=${fields.storeId}`;
}

export function buildEasyPaisaMerchantHash(
  fields: Parameters<typeof buildEasyPaisaHashString>[0],
  credentials: EasyPaisaCredentials,
): string {
  const plaintext = buildEasyPaisaHashString(fields);
  if (credentials.algorithm === "hmac-sha256") {
    return createHmac("sha256", credentials.hashKey)
      .update(plaintext, "utf8")
      .digest("hex")
      .toUpperCase();
  }
  return aes128EcbHex(plaintext, credentials.hashKey);
}

export function verifyEasyPaisaHash(
  fields: Parameters<typeof buildEasyPaisaHashString>[0],
  receivedHash: string | undefined,
  credentials: EasyPaisaCredentials,
): boolean {
  if (!receivedHash?.trim()) return false;
  const expected = buildEasyPaisaMerchantHash(fields, credentials);
  const a = Buffer.from(receivedHash.trim().toUpperCase());
  const b = Buffer.from(expected.toUpperCase());
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function buildEasyPaisaHostedFields(input: {
  credentials: EasyPaisaCredentials;
  amount: number;
  orderRefNum: string;
  postBackURL: string;
}): Record<string, string> {
  const amount = formatEasyPaisaAmount(input.amount);
  const base = {
    amount,
    autoRedirect: "1",
    emailAddr: "",
    mobileNum: "",
    orderRefNum: input.orderRefNum,
    paymentMethod: "",
    postBackURL: input.postBackURL,
    storeId: input.credentials.storeId,
  };
  return {
    storeId: input.credentials.storeId,
    amount,
    postBackURL: input.postBackURL,
    orderRefNum: input.orderRefNum,
    autoRedirect: "1",
    merchantHashedReq: buildEasyPaisaMerchantHash(base, input.credentials),
  };
}

export function isEasyPaisaSuccessStatus(status: string | undefined): boolean {
  const normalized = (status ?? "").trim().toUpperCase();
  return (
    normalized === "PAID" ||
    normalized === "SUCCESS" ||
    normalized === "000" ||
    normalized === "0000"
  );
}

export function isEasyPaisaPendingStatus(status: string | undefined): boolean {
  const normalized = (status ?? "").trim().toUpperCase();
  return (
    normalized === "PENDING" ||
    normalized === "INPROCESS" ||
    normalized === "IN_PROCESS" ||
    normalized === "INITIATED"
  );
}

export function isEasyPaisaCancelledStatus(status: string | undefined): boolean {
  const normalized = (status ?? "").trim().toUpperCase();
  return (
    normalized === "CANCELLED" ||
    normalized === "CANCELED" ||
    normalized === "ABORTED" ||
    normalized === "USER_CANCELLED"
  );
}

export function isEasyPaisaExpiredStatus(status: string | undefined): boolean {
  const normalized = (status ?? "").trim().toUpperCase();
  return normalized === "EXPIRED" || normalized === "TIMEOUT";
}

export function sanitizeEasyPaisaFields(
  fields: Record<string, string>,
): Record<string, string> {
  const sanitized: Record<string, string> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (/hash|password|key|secret/i.test(key)) continue;
    sanitized[key] = value;
  }
  return sanitized;
}
