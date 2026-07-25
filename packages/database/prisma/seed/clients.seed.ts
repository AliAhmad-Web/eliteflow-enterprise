import type { PrismaClient } from "../../../src/generated/client";

import { CLIENT_SEED_DATA } from "./data/clients.data";
import { seedLog } from "./utils/logger";

export async function seedClients(prisma: PrismaClient): Promise<void> {
  seedLog("Seeding clients...");

  for (const client of CLIENT_SEED_DATA) {
    const existing = await prisma.client.findFirst({
      where: {
        email: client.email,
        deletedAt: null,
      },
    });

    if (existing) {
      await prisma.client.update({
        where: { id: existing.id },
        data: {
          companyName: client.companyName,
          contactName: client.contactName,
          phone: client.phone ?? null,
          website: client.website ?? null,
          addressLine1: client.addressLine1 ?? null,
          city: client.city ?? null,
          country: client.country ?? null,
          status: client.status,
          notes: client.notes ?? null,
        },
      });
      seedLog(`  ✓ Updated client ${client.email}`);
      continue;
    }

    await prisma.client.create({
      data: {
        companyName: client.companyName,
        contactName: client.contactName,
        email: client.email,
        phone: client.phone,
        website: client.website,
        addressLine1: client.addressLine1,
        city: client.city,
        country: client.country,
        status: client.status,
        notes: client.notes,
      },
    });
    seedLog(`  ✓ Created client ${client.email}`);
  }
}
