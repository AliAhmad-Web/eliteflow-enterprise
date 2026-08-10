/**
 * P1 verification — hard MFA enrollment gate for ADMIN / SUPER_ADMIN.
 * Run: npx tsx scripts/verify-mfa-hard-block.ts
 * (from apps/api)
 */

import assert from "node:assert/strict";

import { AUTH_ERROR_CODES } from "@enterprise/shared";

import { AuthError } from "../src/modules/auth/auth.errors.js";
import {
  enforceMfaEnrollment,
  isMfaEnrollmentAllowedEndpoint,
} from "../src/shared/security/mfa-enrollment/index.js";

const results: Array<{ name: string; ok: boolean; detail?: string }> = [];

async function check(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`  PASS  ${name}`);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    results.push({ name, ok: false, detail });
    console.error(`  FAIL  ${name}: ${detail}`);
  }
}

async function main(): Promise<void> {
  console.log("\nHard MFA enrollment gate verification\n");

  await check("ADMIN without MFA blocked on privileged path", async () => {
    await assert.rejects(
      () =>
        enforceMfaEnrollment({
          userId: "u-admin",
          role: "ADMIN",
          twoFactorEnabled: false,
          method: "GET",
          path: "/security/ops",
        }),
      (err: unknown) =>
        err instanceof AuthError &&
        err.code === AUTH_ERROR_CODES.MFA_ENROLLMENT_REQUIRED &&
        err.statusCode === 403,
    );
  });

  await check("SUPER_ADMIN without MFA blocked", async () => {
    await assert.rejects(
      () =>
        enforceMfaEnrollment({
          userId: "u-sa",
          role: "SUPER_ADMIN",
          twoFactorEnabled: false,
          method: "GET",
          path: "/team/employees",
        }),
      (err: unknown) =>
        err instanceof AuthError &&
        err.code === AUTH_ERROR_CODES.MFA_ENROLLMENT_REQUIRED,
    );
  });

  await check("ADMIN with MFA allowed", async () => {
    await enforceMfaEnrollment({
      userId: "u-admin",
      role: "ADMIN",
      twoFactorEnabled: true,
      method: "GET",
      path: "/security/ops",
    });
  });

  await check("SUPER_ADMIN with MFA allowed", async () => {
    await enforceMfaEnrollment({
      userId: "u-sa",
      role: "SUPER_ADMIN",
      twoFactorEnabled: true,
      method: "GET",
      path: "/security/ops",
    });
  });

  await check("CLIENT unchanged on /tasks (portal)", async () => {
    await enforceMfaEnrollment({
      userId: "u-client",
      role: "CLIENT",
      twoFactorEnabled: false,
      method: "GET",
      path: "/tasks",
    });
    await enforceMfaEnrollment({
      userId: "u-client",
      role: "CLIENT",
      twoFactorEnabled: false,
      method: "GET",
      path: "/tasks/stats",
    });
  });

  await check("ADMIN without MFA still blocked on /tasks", async () => {
    await assert.rejects(
      () =>
        enforceMfaEnrollment({
          userId: "u-admin",
          role: "ADMIN",
          twoFactorEnabled: false,
          method: "GET",
          path: "/tasks",
        }),
      (err: unknown) =>
        err instanceof AuthError &&
        err.code === AUTH_ERROR_CODES.MFA_ENROLLMENT_REQUIRED,
    );
  });

  await check("CLIENT unchanged (no MFA gate)", async () => {
    await enforceMfaEnrollment({
      userId: "u-client",
      role: "CLIENT",
      twoFactorEnabled: false,
      method: "GET",
      path: "/projects",
    });
  });

  await check("EMPLOYEE unchanged (no MFA gate)", async () => {
    await enforceMfaEnrollment({
      userId: "u-emp",
      role: "EMPLOYEE",
      twoFactorEnabled: false,
      method: "GET",
      path: "/tasks",
    });
  });

  await check("MFA setup routes allowlisted", async () => {
    assert.equal(isMfaEnrollmentAllowedEndpoint("GET", "/auth/mfa/status"), true);
    assert.equal(isMfaEnrollmentAllowedEndpoint("POST", "/auth/mfa/setup"), true);
    assert.equal(isMfaEnrollmentAllowedEndpoint("POST", "/auth/mfa/enable"), true);
    await enforceMfaEnrollment({
      userId: "u-admin",
      role: "ADMIN",
      twoFactorEnabled: false,
      method: "GET",
      path: "/auth/mfa/status",
    });
  });

  await check("Logout allowlisted", async () => {
    assert.equal(isMfaEnrollmentAllowedEndpoint("POST", "/auth/logout"), true);
    await enforceMfaEnrollment({
      userId: "u-admin",
      role: "ADMIN",
      twoFactorEnabled: false,
      method: "POST",
      path: "/auth/logout",
    });
  });

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed\n`);
  if (failed.length) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
