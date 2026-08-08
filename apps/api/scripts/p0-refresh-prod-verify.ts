/**
 * P0 production verification — authenticated refresh timing + sample module GETs.
 * Run: npx @railway/cli@latest run --service api -- npx tsx apps/api/scripts/p0-refresh-prod-verify.ts
 */
import { prisma } from "@enterprise/database";

import { authService } from "../src/modules/auth/auth.service.js";
import {
  generateOpaqueRefreshToken,
  hashRefreshToken,
  getRefreshTokenExpiresAt,
} from "../src/modules/auth/auth.tokens.js";
import { sessionService } from "../src/modules/auth/session/index.js";

const API = process.env.RAILWAY_PUBLIC_DOMAIN
  ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
  : process.env.API_PUBLIC_URL ?? "https://api-production-a778.up.railway.app";

async function main() {
  const email = process.env.P0_VERIFY_EMAIL ?? "admin@eliteflow.dev";
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, status: true },
  });
  if (!user) {
    throw new Error(`User not found: ${email}`);
  }

  const session = await sessionService.createSession({
    userId: user.id,
    deviceName: "p0-refresh-verify",
    ipAddress: "127.0.0.1",
    userAgent: "p0-refresh-prod-verify",
    rememberMe: true,
  });

  const opaque = generateOpaqueRefreshToken();
  const tokenHash = hashRefreshToken(opaque);
  await prisma.refreshToken.create({
    data: {
      tokenHash,
      userId: user.id,
      sessionId: session.sessionId,
      expiresAt: getRefreshTokenExpiresAt(true),
    },
  });

  const context = {
    ipAddress: "127.0.0.1",
    userAgent: "p0-refresh-prod-verify",
  };

  const samples: number[] = [];
  let accessToken = "";

  for (let i = 0; i < 5; i += 1) {
    const t0 = Date.now();
    const result = await authService.refresh(opaque, context);
    const ms = Date.now() - t0;
    samples.push(ms);
    accessToken = result.accessToken;
    console.log(
      JSON.stringify({
        step: `refresh_service_${i + 1}`,
        ms,
        hasAccessToken: Boolean(result.accessToken),
        rotated: Boolean(result.refreshToken),
      }),
    );
    if (result.refreshToken) {
      // Rotation returned a new opaque token — switch for subsequent calls.
      // Keep using original opaque if null (young-token path).
    }
  }

  // HTTP refresh with cookie against public URL (real browser path).
  const cookieName =
    process.env.NODE_ENV === "production"
      ? "__Secure-refresh-token"
      : "refresh-token";

  const httpSamples: number[] = [];
  for (let i = 0; i < 3; i += 1) {
    const t0 = Date.now();
    const res = await fetch(`${API}/api/v1/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `${cookieName}=${opaque}`,
        Origin: "https://eliteflow-web.vercel.app",
      },
      body: "{}",
    });
    const ms = Date.now() - t0;
    httpSamples.push(ms);
    const json = (await res.json()) as {
      success?: boolean;
      data?: { accessToken?: string };
      message?: string;
    };
    if (json.data?.accessToken) {
      accessToken = json.data.accessToken;
    }
    console.log(
      JSON.stringify({
        step: `refresh_http_${i + 1}`,
        status: res.status,
        ms,
        success: json.success,
        message: json.message ?? null,
      }),
    );
  }

  const paths = [
    "/api/v1/auth/me",
    "/api/v1/ai/conversations?page=1&limit=10",
    "/api/v1/communication/conversations?page=1&limit=10",
    "/api/v1/notifications?page=1&limit=10",
    "/api/v1/team/employees?page=1&limit=10",
    "/api/v1/files/folders",
    "/api/v1/invoices?page=1&limit=10",
    "/api/v1/integrations",
    "/api/v1/security/overview",
    "/api/v1/whiteboards?page=1&limit=10",
    "/api/v1/projects?page=1&limit=10",
    "/api/v1/tasks?page=1&limit=10",
    "/api/v1/clients?page=1&limit=10",
    "/api/v1/calendar/events?page=1&limit=10",
    "/api/v1/reports/overview",
  ];

  for (const path of paths) {
    const t0 = Date.now();
    const res = await fetch(`${API}${path}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Origin: "https://eliteflow-web.vercel.app",
      },
    });
    const ms = Date.now() - t0;
    let ok = res.ok;
    let preview = "";
    try {
      const text = await res.text();
      preview = text.slice(0, 120);
      const parsed = JSON.parse(text) as { success?: boolean };
      if (parsed.success === false) ok = false;
    } catch {
      // ignore
    }
    console.log(
      JSON.stringify({
        step: "module_get",
        path,
        status: res.status,
        ms,
        ok,
        preview,
      }),
    );
  }

  const avg = (arr: number[]) =>
    Math.round(arr.reduce((a, b) => a + b, 0) / Math.max(arr.length, 1));

  console.log(
    JSON.stringify({
      step: "summary",
      user: user.email,
      refreshServiceMs: samples,
      refreshServiceAvgMs: avg(samples),
      refreshServiceMaxMs: Math.max(...samples),
      refreshHttpMs: httpSamples,
      refreshHttpAvgMs: avg(httpSamples),
      refreshHttpMaxMs: Math.max(...httpSamples),
      apiBase: API,
    }),
  );
}

main()
  .catch((err) => {
    console.error("P0_VERIFY_FAILED", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
