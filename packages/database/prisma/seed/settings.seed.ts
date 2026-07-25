import type { PrismaClient } from "../../src/generated/client";
import { seedLog } from "./utils/logger";

type Db = PrismaClient;

export async function seedSettings(db: Db): Promise<void> {
  seedLog("Seeding settings module...");

  await db.organizationSettings.upsert({
    where: { key: "default" },
    update: {
      companyName: "EliteFlow",
      brandColor: "#6366f1",
      website: "https://eliteflow.dev",
      country: "United States",
      currency: "USD",
      timezone: "UTC",
    },
    create: {
      key: "default",
      companyName: "EliteFlow",
      brandColor: "#6366f1",
      website: "https://eliteflow.dev",
      country: "United States",
      currency: "USD",
      timezone: "UTC",
      emailFromName: "EliteFlow",
      emailFromAddress: "noreply@eliteflow.dev",
      storageProvider: "local",
      storageQuotaBytes: BigInt(50 * 1024 * 1024 * 1024),
    },
  });

  const now = new Date();
  const end = new Date(now);
  end.setMonth(end.getMonth() + 1);

  await db.organizationBilling.upsert({
    where: { key: "default" },
    update: {
      planCode: "professional",
      planName: "Professional",
      seatsIncluded: 25,
    },
    create: {
      key: "default",
      planCode: "professional",
      planName: "Professional",
      status: "ACTIVE",
      seatsIncluded: 25,
      seatsUsed: 4,
      storageQuotaBytes: BigInt(50 * 1024 * 1024 * 1024),
      storageUsedBytes: BigInt(0),
      aiCreditsIncluded: 5000,
      aiCreditsUsed: 120,
      billingEmail: "billing@eliteflow.dev",
      currentPeriodStart: now,
      currentPeriodEnd: end,
    },
  });

  const users = await db.user.findMany({
    where: { deletedAt: null },
    select: { id: true, email: true },
  });

  for (const user of users) {
    await db.userPreference.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        themeMode: "SYSTEM",
        language: "EN",
        timezone: "UTC",
        currency: "USD",
      },
    });

    if (user.email.startsWith("admin@") || user.email.startsWith("superadmin@")) {
      await db.user.update({
        where: { id: user.id },
        data: {
          username: user.email.split("@")[0] ?? null,
          designation: user.email.startsWith("super")
            ? "Super Admin"
            : "Administrator",
        },
      });
    }
  }

  seedLog("Settings module seed completed.");
}
