const REMEMBER_EMAIL_KEY = "ebm.remember.email";

export function getRememberedEmail(): string {
  if (typeof window === "undefined") {
    return "";
  }

  return localStorage.getItem(REMEMBER_EMAIL_KEY) ?? "";
}

export function setRememberedEmail(email: string | null): void {
  if (typeof window === "undefined") {
    return;
  }

  if (email) {
    localStorage.setItem(REMEMBER_EMAIL_KEY, email);
    return;
  }

  localStorage.removeItem(REMEMBER_EMAIL_KEY);
}
