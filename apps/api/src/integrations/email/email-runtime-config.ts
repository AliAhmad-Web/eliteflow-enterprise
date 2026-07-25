/** Runtime Resend API key from Integration Center (never logged). */

let resendRuntimeApiKey: string | null = null;

export function setResendRuntimeApiKey(key: string | null): void {
  resendRuntimeApiKey = key?.trim() || null;
}

export function getResendRuntimeApiKey(): string | null {
  return resendRuntimeApiKey;
}
