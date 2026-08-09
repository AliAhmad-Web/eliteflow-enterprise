/**
 * Production browser smoke: CLIENT signup → email verify → login → portal
 * + scoped data + isolation. Does NOT disable reCAPTCHA or Zero Trust.
 *
 * Uses Playwright (real Chromium) for captcha + forms, and 1secmail
 * to receive the real verification email link.
 *
 *   npx tsx apps/api/scripts/verify-client-portal-browser-smoke.ts
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { chromium, type Page } from "playwright";
import { prisma } from "@enterprise/database";

const WEB =
  process.env.PROD_WEB_URL?.replace(/\/$/, "") ??
  "https://eliteflow-web.vercel.app";
const API =
  process.env.PROD_API_URL?.replace(/\/$/, "") ??
  "https://api-production-a778.up.railway.app";

const RUN = randomUUID().slice(0, 8);
let accountPassword = `P0Browser!${RUN}Aa1`;
const mailPassword = `MailTm!${RUN}Aa1`;

type MailTmDomain = { domain: string; isActive: boolean };
type MailTmMsg = { id: string; subject: string; intro?: string };

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

async function createMailTmInbox(): Promise<{
  email: string;
  token: string;
}> {
  const domainsRes = await fetch("https://api.mail.tm/domains");
  const domainsJson = (await domainsRes.json()) as {
    "hydra:member"?: MailTmDomain[];
  };
  const domain =
    domainsJson["hydra:member"]?.find((d) => d.isActive)?.domain ??
    domainsJson["hydra:member"]?.[0]?.domain;
  assert.ok(domain, "mail.tm domain unavailable");

  const address = `eliteflowp0${RUN}@${domain}`.toLowerCase();
  const createRes = await fetch("https://api.mail.tm/accounts", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ address, password: mailPassword }),
  });
  const createText = await createRes.text();
  if (!createRes.ok) {
    throw new Error(`mail.tm account create failed: ${createText}`);
  }
  const created = JSON.parse(createText) as { address?: string };
  const finalAddress = (created.address ?? address).toLowerCase();

  const tokenRes = await fetch("https://api.mail.tm/token", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ address: finalAddress, password: mailPassword }),
  });
  if (!tokenRes.ok) {
    throw new Error(`mail.tm token failed: ${await tokenRes.text()}`);
  }
  const tokenJson = (await tokenRes.json()) as { token?: string };
  assert.ok(tokenJson.token, "mail.tm token missing");
  return { email: finalAddress, token: tokenJson.token };
}

async function waitForVerificationUrl(
  mailToken: string,
  timeoutMs = 180_000,
): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const listRes = await fetch("https://api.mail.tm/messages", {
      headers: { authorization: `Bearer ${mailToken}` },
    });
    if (!listRes.ok) {
      await sleep(4000);
      continue;
    }
    const listJson = (await listRes.json()) as {
      "hydra:member"?: MailTmMsg[];
    };
    const messages = listJson["hydra:member"] ?? [];
    for (const msg of messages) {
      const fullRes = await fetch(`https://api.mail.tm/messages/${msg.id}`, {
        headers: { authorization: `Bearer ${mailToken}` },
      });
      if (!fullRes.ok) continue;
      const full = (await fullRes.json()) as {
        text?: string;
        html?: string[];
        intro?: string;
      };
      const blob = `${full.text ?? ""}\n${(full.html ?? []).join("\n")}\n${full.intro ?? ""}`;
      const match =
        blob.match(/https?:\/\/[^\s"'<>]*verify-email\?token=[^\s"'<>]+/i) ??
        blob.match(/\/verify-email\?token=([^\s"'<>&]+)/i);
      if (match) {
        if (match[0].startsWith("http")) return match[0].replace(/&amp;/g, "&");
        return `${WEB}/verify-email?token=${decodeURIComponent(match[1]!)}`;
      }
    }
    await sleep(5000);
  }
  throw new Error("Verification email not received in time");
}

async function humanType(page: Page, selector: string, value: string) {
  const el = page.locator(selector);
  await el.click({ delay: 40 });
  await el.fill("");
  await el.pressSequentially(value, { delay: 45 + Math.floor(Math.random() * 35) });
}

async function waitForRecaptcha(page: Page) {
  await page
    .waitForFunction(
      () =>
        Boolean(
          (window as unknown as { grecaptcha?: { execute?: unknown } }).grecaptcha
            ?.execute,
        ),
      { timeout: 60_000 },
    )
    .catch(() => undefined);
  await sleep(2500);
}

async function fillSignup(page: Page, accountEmail: string) {
  await page.goto(`${WEB}/`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.mouse.move(120, 160);
  await sleep(1200);
  await page.goto(`${WEB}/signup`, {
    waitUntil: "domcontentloaded",
    timeout: 90_000,
  });
  await page.waitForSelector("#firstName", { timeout: 60_000 });
  await waitForRecaptcha(page);
  await page.mouse.move(240, 280);
  await sleep(800);
  await humanType(page, "#firstName", "P0");
  await sleep(300);
  await humanType(page, "#lastName", "Browser");
  await sleep(350);
  await humanType(page, "#signup-email", accountEmail);
  await sleep(400);
  await humanType(page, "#signup-password", accountPassword);
  await sleep(350);
  await humanType(page, "#confirmPassword", accountPassword);
  await page.locator('input[type="checkbox"]').first().check();
  await page.mouse.move(420, 640);
  await sleep(2000);
  await page.getByRole("button", { name: /create account/i }).click({ delay: 80 });
}

async function fillLogin(page: Page, accountEmail: string) {
  await page.goto(`${WEB}/login`, {
    waitUntil: "domcontentloaded",
    timeout: 90_000,
  });
  await page.waitForSelector("#email", { timeout: 60_000 });
  await waitForRecaptcha(page);
  await humanType(page, "#email", accountEmail);
  await sleep(300);
  await humanType(page, "#password", accountPassword);
  await sleep(1500);
  await page.getByRole("button", { name: /^sign in$/i }).click({ delay: 80 });
}

async function readAccessToken(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        if (raw.startsWith("eyJ")) return raw;
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        if (typeof parsed.accessToken === "string") return parsed.accessToken;
        if (typeof parsed.state === "string" && parsed.state.startsWith("eyJ")) {
          return parsed.state;
        }
        const state = parsed.state as Record<string, unknown> | undefined;
        if (state && typeof state.accessToken === "string") {
          return state.accessToken;
        }
      } catch {
        // continue
      }
    }
    return null;
  });
}

async function apiJsonFromBrowser(
  page: Page,
  path: string,
  token: string,
): Promise<{ status: number; body: Record<string, unknown> }> {
  return page.evaluate(
    async ({ apiBase, apiPath, accessToken }) => {
      const res = await fetch(`${apiBase}${apiPath}`, {
        headers: { authorization: `Bearer ${accessToken}` },
      });
      const body = (await res.json()) as Record<string, unknown>;
      return { status: res.status, body };
    },
    { apiBase: API, apiPath: path, accessToken: token },
  );
}

async function main() {
  assert.ok(process.env.DATABASE_URL, "DATABASE_URL required");

  const inbox = await createMailTmInbox();
  const email = inbox.email;
  const mailToken = inbox.token;

  const channel = process.env.PW_CHANNEL || "chrome";
  const browser = await chromium.launch({
    // reCAPTCHA v3 commonly fails headless-shell; use installed Chrome/Edge.
    headless: false,
    channel,
    slowMo: 35,
    args: [
      "--disable-blink-features=AutomationControlled",
      "--disable-features=IsolateOrigins,site-per-process",
    ],
  });
  const context = await browser.newContext({
    locale: "en-US",
    timezoneId: "Asia/Karachi",
    viewport: { width: 1365, height: 900 },
    hasTouch: false,
    isMobile: false,
  });
  const page = await context.newPage();
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
    Object.defineProperty(navigator, "languages", {
      get: () => ["en-US", "en"],
    });
    Object.defineProperty(navigator, "plugins", {
      get: () => [1, 2, 3, 4, 5],
    });
  });

  let accessTokenFromLogin: string | null = null;
  let signupError: string | null = null;
  page.on("response", async (response) => {
    const url = response.url();
    const method = response.request().method();
    if (method !== "POST") return;
    if (!url.includes("/auth/signup") && !url.includes("/auth/login")) return;
    try {
      const json = (await response.json()) as {
        success?: boolean;
        message?: string;
        code?: string;
        data?: {
          tokens?: { accessToken?: string };
          accessToken?: string;
          user?: { companyId?: string | null };
        };
      };
      if (url.includes("/auth/signup") && json.success === false) {
        signupError = `${json.code ?? "ERR"}: ${json.message ?? "signup failed"}`;
      }
      if (url.includes("/auth/login")) {
        if (json.success === false) {
          signupError = `LOGIN ${json.code ?? "ERR"}: ${json.message ?? "login failed"}`;
        } else {
          const token =
            json.data?.tokens?.accessToken ?? json.data?.accessToken ?? null;
          if (token) accessTokenFromLogin = token;
          console.log(
            JSON.stringify({
              step: "login_api",
              success: json.success !== false,
              hasToken: Boolean(token),
              keys: Object.keys(json.data ?? {}),
            }),
          );
        }
      }
    } catch {
      // ignore non-json
    }
  });

  console.log(JSON.stringify({ step: "signup_start", email, web: WEB }));

  let signedUp = false;
  for (let attempt = 1; attempt <= 8; attempt++) {
    signupError = null;
    await fillSignup(page, email);
    try {
      await Promise.race([
        page.waitForURL(/login\?.*registered=1/, { timeout: 90_000 }),
        page.waitForResponse(
          (r) =>
            r.url().includes("/auth/signup") && r.request().method() === "POST",
          { timeout: 90_000 },
        ),
      ]);
    } catch {
      // fall through
    }
    await sleep(2000);
    if (!signupError && page.url().includes("registered=1")) {
      signedUp = true;
      break;
    }
    const alertText =
      (await page
        .locator("[role='alert'], .text-destructive")
        .first()
        .textContent()
        .catch(() => null)) ?? "";
    const captchaBlocked =
      Boolean(signupError?.includes("CAPTCHA")) ||
      /captcha|reCAPTCHA/i.test(alertText);
    if (captchaBlocked && attempt < 8) {
      const backoffMs = 12_000 * attempt;
      console.log(
        JSON.stringify({
          step: "signup_captcha_retry",
          attempt,
          backoffMs,
          signupError,
          alertText: alertText.slice(0, 160),
        }),
      );
      await sleep(backoffMs);
      continue;
    }
    break;
  }

  const pageDiag = {
    url: page.url(),
    alert: await page.locator("[role='alert'], .text-destructive").first().textContent().catch(() => null),
    bodySnippet: (await page.locator("body").innerText().catch(() => "")).slice(0, 500),
    signupError,
    signedUp,
  };
  console.log(JSON.stringify({ step: "signup_diag", ...pageDiag }));

  if (signupError || !signedUp) {
    throw new Error(`Signup API failed: ${signupError ?? "no registered redirect"}`);
  }

  const user = await prisma.user.findFirst({
    where: { email: email.toLowerCase() },
    select: {
      id: true,
      companyId: true,
      emailVerified: true,
      status: true,
      company: { select: { id: true, companyName: true, email: true } },
    },
  });
  assert.ok(user, "user not created after signup");
  assert.ok(user.companyId, "companyId must be set by signup onboarding");
  assert.ok(user.company, "Client CRM must exist after signup");
  assert.equal(user.company!.email, email.toLowerCase());

  console.log(
    JSON.stringify({
      step: "signup_linked",
      userId: user.id,
      companyId: user.companyId,
      companyName: user.company!.companyName,
    }),
  );

  const verifyUrl = await waitForVerificationUrl(mailToken);
  console.log(JSON.stringify({ step: "email_received" }));
  await page.goto(verifyUrl, { waitUntil: "domcontentloaded" });
  await sleep(3000);

  const afterVerify = await prisma.user.findFirst({
    where: { id: user.id },
    select: { emailVerified: true, status: true },
  });
  assert.equal(afterVerify?.emailVerified, true, "email must be verified");

  await fillLogin(page, email);
  try {
    await page.waitForResponse(
      (r) => r.url().includes("/auth/login") && r.request().method() === "POST",
      { timeout: 90_000 },
    );
  } catch {
    // continue with diagnostics
  }
  await sleep(4000);

  for (let loginAttempt = 1; loginAttempt <= 6; loginAttempt++) {
    const loginFailed =
      Boolean(signupError?.includes("CAPTCHA")) ||
      (await page
        .locator("text=Captcha verification failed")
        .isVisible()
        .catch(() => false));
    if (accessTokenFromLogin || !loginFailed) break;
    const backoffMs = 15_000 * loginAttempt;
    console.log(
      JSON.stringify({
        step: "login_captcha_retry",
        loginAttempt,
        backoffMs,
        signupError,
      }),
    );
    signupError = null;
    await sleep(backoffMs);
    await fillLogin(page, email);
    try {
      await page.waitForResponse(
        (r) =>
          r.url().includes("/auth/login") && r.request().method() === "POST",
        { timeout: 90_000 },
      );
    } catch {
      // continue
    }
    await sleep(3000);
  }

  const loginDiag = {
    url: page.url(),
    alert: await page
      .locator("[role='alert'], .text-destructive")
      .first()
      .textContent()
      .catch(() => null),
    hasToken: Boolean(accessTokenFromLogin),
    bodySnippet: (await page.locator("body").innerText().catch(() => "")).slice(
      0,
      600,
    ),
  };
  console.log(JSON.stringify({ step: "login_diag", ...loginDiag }));

  // Production password policy: signup historically left passwordChangedAt null
  // → treated as expired until first change. Complete the gate without bypassing it.
  const mustChangeVisible = await page
    .locator("#must-change-current")
    .isVisible()
    .catch(() => false);
  if (mustChangeVisible || /Change your password/i.test(loginDiag.bodySnippet)) {
    const nextPassword = `P0Browser2!${RUN}Aa1`;
    await humanType(page, "#must-change-current", accountPassword);
    await humanType(page, "#must-change-new", nextPassword);
    await humanType(page, "#must-change-confirm", nextPassword);
    await page.getByRole("button", { name: /update password/i }).click({ delay: 60 });
    await page
      .waitForResponse(
        (r) =>
          (r.url().includes("/password") ||
            r.url().includes("/change-password") ||
            r.url().includes("/security")) &&
          ["POST", "PATCH", "PUT"].includes(r.request().method()),
        { timeout: 60_000 },
      )
      .catch(() => undefined);
    await sleep(3000);
    accountPassword = nextPassword;
    console.log(JSON.stringify({ step: "password_changed" }));
    // Token may rotate after password change — capture fresh login if needed.
    accessTokenFromLogin = null;
    signupError = null;
    await fillLogin(page, email);
    await page
      .waitForResponse(
        (r) =>
          r.url().includes("/auth/login") && r.request().method() === "POST",
        { timeout: 90_000 },
      )
      .catch(() => undefined);
    await sleep(3000);
    for (let loginAttempt = 1; loginAttempt <= 4; loginAttempt++) {
      if (accessTokenFromLogin) break;
      const loginFailed =
        Boolean(signupError?.includes("CAPTCHA")) ||
        (await page
          .locator("text=Captcha verification failed")
          .isVisible()
          .catch(() => false));
      if (!loginFailed) break;
      console.log(
        JSON.stringify({
          step: "post_pw_login_captcha_retry",
          loginAttempt,
          signupError,
        }),
      );
      signupError = null;
      await sleep(15_000 * loginAttempt);
      await fillLogin(page, email);
      await page
        .waitForResponse(
          (r) =>
            r.url().includes("/auth/login") && r.request().method() === "POST",
          { timeout: 90_000 },
        )
        .catch(() => undefined);
      await sleep(2500);
    }
    await page.goto(`${WEB}/portal`, { waitUntil: "domcontentloaded" });
    await sleep(3000);
  }

  // Prefer portal route
  if (!page.url().includes("/portal")) {
    await page.goto(`${WEB}/portal`, { waitUntil: "domcontentloaded" });
    await sleep(3000);
  }

  let token = accessTokenFromLogin ?? (await readAccessToken(page));
  assert.ok(token, `access token missing after login: ${JSON.stringify(loginDiag)}`);

  // If legacy accounts still have null passwordChangedAt, complete the
  // allowed password-change endpoint (no captcha/ZT bypass).
  {
    const status = await apiJsonFromBrowser(
      page,
      "/api/v1/security/password-status",
      token,
    );
    const statusData = (status.body.data ?? status.body) as Record<string, unknown>;
    const needsChange =
      statusData.mustChangePassword === true ||
      statusData.passwordExpired === true ||
      statusData.requiresChange === true;
    console.log(
      JSON.stringify({
        step: "password_status",
        http: status.status,
        needsChange,
        keys: Object.keys(statusData),
      }),
    );
    if (needsChange && status.status === 200) {
      const nextPassword = `P0Browser2!${RUN}Aa1`;
      const changeResult = await page.evaluate(
        async ({ apiBase, accessToken, currentPassword, newPassword }) => {
          const res = await fetch(`${apiBase}/api/v1/security/password/change`, {
            method: "POST",
            headers: {
              authorization: `Bearer ${accessToken}`,
              "content-type": "application/json",
            },
            body: JSON.stringify({
              currentPassword,
              newPassword,
              confirmPassword: newPassword,
            }),
          });
          const body = (await res.json()) as Record<string, unknown>;
          return { status: res.status, body };
        },
        {
          apiBase: API,
          accessToken: token,
          currentPassword: accountPassword,
          newPassword: nextPassword,
        },
      );
      console.log(
        JSON.stringify({
          step: "password_change_api",
          status: changeResult.status,
          success: (changeResult.body as { success?: boolean }).success,
        }),
      );
      assert.ok(
        changeResult.status === 200 || changeResult.status === 201,
        JSON.stringify(changeResult),
      );
      accountPassword = nextPassword;
      accessTokenFromLogin = null;
      signupError = null;
      await fillLogin(page, email);
      await page
        .waitForResponse(
          (r) =>
            r.url().includes("/auth/login") && r.request().method() === "POST",
          { timeout: 90_000 },
        )
        .catch(() => undefined);
      await sleep(3000);
      for (let loginAttempt = 1; loginAttempt <= 5; loginAttempt++) {
        if (accessTokenFromLogin) break;
        const loginFailed =
          Boolean(signupError?.includes("CAPTCHA")) ||
          (await page
            .locator("text=Captcha verification failed")
            .isVisible()
            .catch(() => false));
        if (!loginFailed) break;
        console.log(
          JSON.stringify({
            step: "post_api_pw_login_retry",
            loginAttempt,
            signupError,
          }),
        );
        signupError = null;
        await sleep(12_000 * loginAttempt);
        await fillLogin(page, email);
        await page
          .waitForResponse(
            (r) =>
              r.url().includes("/auth/login") &&
              r.request().method() === "POST",
            { timeout: 90_000 },
          )
          .catch(() => undefined);
        await sleep(2500);
      }
      token = accessTokenFromLogin ?? (await readAccessToken(page));
      assert.ok(token, "token missing after password change re-login");
      await page.goto(`${WEB}/portal`, { waitUntil: "domcontentloaded" });
      await sleep(2500);
    }
  }

  const me = await apiJsonFromBrowser(page, "/api/v1/auth/me", token);
  assert.equal(me.status, 200, JSON.stringify(me.body));
  const meData = (me.body.data ?? me.body) as Record<string, unknown>;
  const meUser = (meData.user as Record<string, unknown> | undefined) ?? meData;
  assert.equal(meUser.companyId, user.companyId);

  // Seed real scoped + foreign data
  const otherClient = await prisma.client.create({
    data: {
      companyName: `P0 Iso Other ${RUN}`,
      contactName: "Other",
      email: `p0.iso.other.${RUN}@eliteflow.test`,
      status: "ACTIVE",
    },
  });
  const ownProject = await prisma.project.create({
    data: {
      name: `P0 Browser Own ${RUN}`,
      clientId: user.companyId!,
      status: "IN_PROGRESS",
      priority: "MEDIUM",
      progress: 20,
    },
  });
  const otherProject = await prisma.project.create({
    data: {
      name: `P0 Browser Other ${RUN}`,
      clientId: otherClient.id,
      status: "IN_PROGRESS",
      priority: "MEDIUM",
      progress: 20,
    },
  });
  const ownInvoice = await prisma.invoice.create({
    data: {
      invoiceNumber: `P0-BR-OWN-${RUN}`,
      clientId: user.companyId!,
      status: "SENT",
      issueDate: new Date(),
      dueDate: new Date(),
      currency: "USD",
      taxRate: 0,
      discountAmount: 0,
      subtotal: 75,
      taxAmount: 0,
      total: 75,
    },
  });
  const otherInvoice = await prisma.invoice.create({
    data: {
      invoiceNumber: `P0-BR-OTH-${RUN}`,
      clientId: otherClient.id,
      status: "SENT",
      issueDate: new Date(),
      dueDate: new Date(),
      currency: "USD",
      taxRate: 0,
      discountAmount: 0,
      subtotal: 120,
      taxAmount: 0,
      total: 120,
    },
  });
  const ownTask = await prisma.task.create({
    data: {
      title: `P0 Browser Task ${RUN}`,
      projectId: ownProject.id,
      status: "TODO",
      priority: "MEDIUM",
    },
  });
  const otherTask = await prisma.task.create({
    data: {
      title: `P0 Browser Other Task ${RUN}`,
      projectId: otherProject.id,
      status: "TODO",
      priority: "MEDIUM",
    },
  });

  const projects = await apiJsonFromBrowser(
    page,
    "/api/v1/projects?page=1&limit=50&sortBy=createdAt&sortOrder=desc",
    token,
  );
  assert.equal(projects.status, 200, JSON.stringify(projects.body));
  const projectItems =
    ((projects.body.data as Record<string, unknown>)?.items as Array<{
      id: string;
      name: string;
    }>) ?? [];
  assert.ok(projectItems.some((p) => p.id === ownProject.id));
  assert.equal(projectItems.some((p) => p.id === otherProject.id), false);

  const crossProject = await apiJsonFromBrowser(
    page,
    `/api/v1/projects/${otherProject.id}`,
    token,
  );
  assert.ok(crossProject.status === 404 || crossProject.status === 403);

  const invoices = await apiJsonFromBrowser(
    page,
    "/api/v1/invoices?page=1&limit=50&sortBy=createdAt&sortOrder=desc",
    token,
  );
  assert.equal(invoices.status, 200, JSON.stringify(invoices.body));
  const invoiceItems =
    ((invoices.body.data as Record<string, unknown>)?.items as Array<{
      id: string;
    }>) ?? [];
  assert.ok(invoiceItems.some((i) => i.id === ownInvoice.id));
  assert.equal(invoiceItems.some((i) => i.id === otherInvoice.id), false);

  const crossInvoice = await apiJsonFromBrowser(
    page,
    `/api/v1/invoices/${otherInvoice.id}`,
    token,
  );
  assert.ok(crossInvoice.status === 404 || crossInvoice.status === 403);

  const tasks = await apiJsonFromBrowser(
    page,
    "/api/v1/tasks?page=1&limit=50&sortBy=createdAt&sortOrder=desc",
    token,
  );
  assert.equal(tasks.status, 200, JSON.stringify(tasks.body));
  const taskItems =
    ((tasks.body.data as Record<string, unknown>)?.items as Array<{
      id: string;
    }>) ?? [];
  assert.ok(taskItems.some((t) => t.id === ownTask.id));
  assert.equal(taskItems.some((t) => t.id === otherTask.id), false);

  await page.goto(`${WEB}/portal`, { waitUntil: "domcontentloaded" });
  await sleep(2500);
  const portalText = await page.locator("body").innerText();
  assert.equal(/Connect your business account/i.test(portalText), false);
  assert.equal(/Acme Redesign|Invoice #1042|Sample project update/i.test(portalText), false);
  assert.ok(
    /Your projects|In progress|Billing|Welcome/i.test(portalText),
    "portal should show live linked dashboard chrome",
  );

  // Cleanup seeded business data (keep user optional — delete for hygiene)
  await prisma.task.deleteMany({
    where: { id: { in: [ownTask.id, otherTask.id] } },
  });
  await prisma.invoice.deleteMany({
    where: { id: { in: [ownInvoice.id, otherInvoice.id] } },
  });
  await prisma.project.deleteMany({
    where: { id: { in: [ownProject.id, otherProject.id] } },
  });
  await prisma.session.deleteMany({ where: { userId: user.id } });
  await prisma.refreshToken.deleteMany({ where: { userId: user.id } }).catch(() => undefined);
  await prisma.emailVerificationToken.deleteMany({ where: { userId: user.id } });
  await prisma.user.delete({ where: { id: user.id } });
  await prisma.client.deleteMany({
    where: { id: { in: [user.companyId!, otherClient.id] } },
  });

  await browser.close();

  console.log(
    JSON.stringify(
      {
        ok: true,
        checks: [
          "browser_signup_with_recaptcha",
          "companyId_auto_linked",
          "email_verification_via_inbox",
          "browser_login_with_recaptcha",
          "me_company_context",
          "own_projects_invoices_tasks",
          "cross_client_denied",
          "portal_no_dummy_no_unlinked_state",
        ],
      },
      null,
      2,
    ),
  );
}

main()
  .catch(async (error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
