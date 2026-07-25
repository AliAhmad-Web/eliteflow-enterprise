import { prisma } from "../../src/client";

import { seedAi } from "./ai.seed";
import { seedCalendar } from "./calendar.seed";
import { seedClients } from "./clients.seed";
import { seedFiles } from "./files.seed";
import { seedInvoices } from "./invoices.seed";
import { seedPermissions } from "./permissions.seed";
import { seedProjects } from "./projects.seed";
import { seedReports } from "./reports.seed";
import { seedCommunication } from "./communication.seed";
import { seedNotifications } from "./notifications.seed";
import { seedRolePermissions } from "./role-permissions.seed";
import { seedRoles } from "./roles.seed";
import { seedSecurity } from "./security.seed";
import { seedSettings } from "./settings.seed";
import { seedTasks } from "./tasks.seed";
import { seedTeam } from "./team.seed";
import { seedUsers } from "./users.seed";
import { seedError, seedLog } from "./utils/logger";

async function main(): Promise<void> {
  const demoPassword = process.env.SEED_DEMO_PASSWORD ?? "Password123!";

  seedLog("Starting database seed...");
  seedLog(`Environment: ${process.env.NODE_ENV ?? "development"}`);

  try {
    const roleIdByCode = await seedRoles(prisma);
    const permissionIdByKey = await seedPermissions(prisma);
    await seedRolePermissions(prisma, roleIdByCode, permissionIdByKey);
    await seedUsers(prisma, roleIdByCode, demoPassword);
    await seedClients(prisma);
    await seedProjects(prisma);
    await seedTasks(prisma);
    await seedInvoices(prisma);
    await seedAi(prisma);
    await seedFiles(prisma);
    await seedCalendar(prisma);
    await seedTeam(prisma);
    await seedReports(prisma);
    await seedNotifications(prisma);
    await seedCommunication(prisma);
    await seedSecurity(prisma);
    await seedSettings(prisma);

    seedLog("Database seed completed successfully.");
    seedLog("");
    seedLog("Demo credentials (development only):");
    seedLog("  Email:    superadmin@eliteflow.dev | admin@eliteflow.dev");
    seedLog("            employee@eliteflow.dev  | client@eliteflow.dev");
    seedLog(`  Password: ${demoPassword}`);
  } catch (error) {
    seedError("Database seed failed", error);
  }
}

main()
  .catch((error: unknown) => {
    seedError("Unhandled seed error", error);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
