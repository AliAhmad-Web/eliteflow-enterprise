import type { PrismaClient } from "../../src/generated/client";
import { seedLog } from "./utils/logger";

type Db = PrismaClient;

/**
 * Phase 17 — Enterprise Security demo data.
 * Seeds sample login attempts, security events, and password history markers.
 * Idempotent via action/resource markers where practical.
 */
export async function seedSecurity(db: Db): Promise<void> {
  seedLog("Seeding security module...");

  const users = await db.user.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      email: true,
      passwordHash: true,
      role: { select: { code: true } },
    },
  });

  const admin =
    users.find((u) => u.email === "admin@eliteflow.dev") ??
    users.find((u) => u.role.code === "ADMIN");
  const employee =
    users.find((u) => u.email === "employee@eliteflow.dev") ??
    users.find((u) => u.role.code === "EMPLOYEE");
  const superAdmin =
    users.find((u) => u.email === "superadmin@eliteflow.dev") ??
    users.find((u) => u.role.code === "SUPER_ADMIN");

  if (!admin || !superAdmin) {
    seedLog("Security seed skipped (missing demo users).");
    return;
  }

  const now = Date.now();
  const hoursAgo = (h: number) => new Date(now - h * 60 * 60 * 1000);

  const existingAttempts = await db.loginAttempt.count({
    where: { email: admin.email },
  });

  if (existingAttempts < 5) {
    await db.loginAttempt.createMany({
      data: [
        {
          email: admin.email,
          userId: admin.id,
          ipAddress: "203.0.113.10",
          userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0",
          success: true,
          createdAt: hoursAgo(2),
        },
        {
          email: admin.email,
          userId: admin.id,
          ipAddress: "198.51.100.22",
          userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) Safari/605.1",
          success: false,
          failureReason: "invalid_credentials",
          createdAt: hoursAgo(6),
        },
        {
          email: employee?.email ?? "employee@eliteflow.dev",
          userId: employee?.id ?? null,
          ipAddress: "192.0.2.55",
          userAgent: "Mozilla/5.0 (X11; Linux x86_64) Firefox/128.0",
          success: true,
          createdAt: hoursAgo(12),
        },
        {
          email: "unknown@attacker.test",
          userId: null,
          ipAddress: "203.0.113.99",
          userAgent: "curl/8.0",
          success: false,
          failureReason: "invalid_credentials",
          createdAt: hoursAgo(1),
        },
        {
          email: admin.email,
          userId: admin.id,
          ipAddress: "203.0.113.10",
          userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0",
          success: true,
          createdAt: hoursAgo(28),
        },
      ],
    });
  }

  const existingEvents = await db.securityEvent.count({
    where: { eventType: "seed_demo_alert" },
  });

  if (existingEvents === 0) {
    await db.securityEvent.createMany({
      data: [
        {
          userId: admin.id,
          severity: "MEDIUM",
          category: "AUTH",
          eventType: "seed_demo_alert",
          message: "Multiple failed login attempts detected from unknown IP",
          metadata: { source: "seed", ip: "203.0.113.99" },
          ipAddress: "203.0.113.99",
          userAgent: "curl/8.0",
          createdAt: hoursAgo(1),
        },
        {
          userId: null,
          severity: "LOW",
          category: "RATE_LIMIT",
          eventType: "seed_demo_alert",
          message: "Rate limit threshold approached on auth.login",
          metadata: { source: "seed", route: "auth.login" },
          ipAddress: "198.51.100.22",
          createdAt: hoursAgo(5),
        },
        {
          userId: superAdmin.id,
          severity: "INFO",
          category: "SESSION",
          eventType: "seed_demo_alert",
          message: "Security Center seed data initialized",
          metadata: { source: "seed" },
          resolvedAt: hoursAgo(0.5),
          createdAt: hoursAgo(0.5),
        },
      ],
    });
  }

  // Seed password history for admin if empty (uses current hash as historical marker)
  if (admin.passwordHash) {
    const historyCount = await db.passwordHistory.count({
      where: { userId: admin.id },
    });
    if (historyCount === 0) {
      await db.passwordHistory.create({
        data: {
          userId: admin.id,
          passwordHash: admin.passwordHash,
          createdAt: hoursAgo(720),
        },
      });
    }
  }

  const existingAudit = await db.auditLog.count({
    where: { action: "security.seed_initialized" },
  });

  if (existingAudit === 0) {
    await db.auditLog.create({
      data: {
        userId: superAdmin.id,
        action: "security.seed_initialized",
        resource: "security",
        resourceId: "phase-17",
        metadata: { phase: 17, module: "enterprise-security" },
        ipAddress: "127.0.0.1",
        userAgent: "eliteflow-seed",
      },
    });
  }

  seedLog("Security module seed completed.");
}
