import { createHmac, timingSafeEqual } from "node:crypto";

export const JAZZCASH_SANDBOX_URL =
  "https://sandbox.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform/";
export const JAZZCASH_PRODUCTION_URL =
  "https://payments.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform/";

export interface JazzCashCredentials {
  merchantId: string;
  password: string;
  integritySalt: string;
  sandbox: boolean;
}

export function getJazzCashCredentials(): JazzCashCredentials | null {
  const merchantId = process.env.JAZZCASH_MERCHANT_ID?.trim();
  const password = process.env.JAZZCASH_PASSWORD?.trim();
  const integritySalt = process.env.JAZZCASH_INTEGRITY_SALT?.trim();
  if (!merchantId || !password || !integritySalt) {
    return null;
  }
  return {
    merchantId,
    password,
    integritySalt,
    sandbox: process.env.JAZZCASH_SANDBOX !== "false",
  };
}

export function jazzCashHostedUrl(sandbox: boolean): string {
  return sandbox ? JAZZCASH_SANDBOX_URL : JAZZCASH_PRODUCTION_URL;
}

/**
 * Official JazzCash HMAC-SHA256:
 * salt + '&' + non-empty field values sorted by key, excluding pp_SecureHash.
 */
export function buildJazzCashSecureHash(
  fields: Record<string, string>,
  integritySalt: string,
): string {
  const keys = Object.keys(fields)
    .filter((key) => key !== "pp_SecureHash" && fields[key] !== "")
    .sort((a, b) => a.localeCompare(b));
  let payload = integritySalt;
  for (const key of keys) {
    payload += `&${fields[key]}`;
  }
  return createHmac("sha256", integritySalt)
    .update(payload, "utf8")
    .digest("hex")
    .toUpperCase();
}

export function verifyJazzCashSecureHash(
  fields: Record<string, string>,
  integritySalt: string,
): boolean {
  const received = (fields.pp_SecureHash ?? "").trim();
  if (!received) return false;
  const expected = buildJazzCashSecureHash(fields, integritySalt);
  const a = Buffer.from(received.toUpperCase());
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function toJazzCashAmountPaisa(amount: number): string {
  return String(Math.round(amount * 100));
}

export function formatJazzCashDateTime(date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

export function addHoursJazzCashDateTime(hours: number, from = new Date()): string {
  return formatJazzCashDateTime(new Date(from.getTime() + hours * 60 * 60 * 1000));
}

export function buildJazzCashTxnRef(paymentNumber: string): string {
  const compact = paymentNumber.replace(/[^A-Za-z0-9]/g, "").slice(-11);
  const stamp = formatJazzCashDateTime().slice(-8);
  return `T${stamp}${compact}`.slice(0, 20);
}

export function buildJazzCashHostedFields(input: {
  credentials: JazzCashCredentials;
  txnRefNo: string;
  amount: number;
  billReference: string;
  description: string;
  returnUrl: string;
}): Record<string, string> {
  const txnDateTime = formatJazzCashDateTime();
  const fields: Record<string, string> = {
    pp_Version: "1.1",
    pp_TxnType: "MWALLET",
    pp_Language: "EN",
    pp_MerchantID: input.credentials.merchantId,
    pp_SubMerchantID: "",
    pp_Password: input.credentials.password,
    pp_BankID: "",
    pp_ProductID: "",
    pp_TxnRefNo: input.txnRefNo,
    pp_Amount: toJazzCashAmountPaisa(input.amount),
    pp_TxnCurrency: "PKR",
    pp_TxnDateTime: txnDateTime,
    pp_BillReference: input.billReference.slice(0, 50),
    pp_Description: input.description.slice(0, 50),
    pp_TxnExpiryDateTime: addHoursJazzCashDateTime(24),
    pp_ReturnURL: input.returnUrl,
    pp_SecureHash: "",
    ppmpf_1: input.billReference.slice(0, 120),
  };
  fields.pp_SecureHash = buildJazzCashSecureHash(
    fields,
    input.credentials.integritySalt,
  );
  return fields;
}

export function isJazzCashSuccessCode(code: string | undefined): boolean {
  return code === "000";
}

export function sanitizeJazzCashFields(
  fields: Record<string, string>,
): Record<string, string> {
  const sanitized: Record<string, string> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (key === "pp_Password" || key === "pp_SecureHash") continue;
    sanitized[key] = value;
  }
  return sanitized;
}
