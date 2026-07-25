import type { PrismaClient } from "../../src/generated/client";
import { ReportCategory, ReportVisibility } from "../../src/generated/client";

import { seedLog } from "./utils/logger";

export async function seedReports(prisma: PrismaClient): Promise<void> {
  seedLog("Seeding reports templates & saved reports...");

  const admin = await prisma.user.findUnique({
    where: { email: "admin@eliteflow.dev" },
    select: { id: true },
  });
  if (!admin) {
    seedLog("  ⚠ Admin missing — skipping reports seed");
    return;
  }

  const templates: Array<{
    name: string;
    category: ReportCategory;
    description: string;
  }> = [
    {
      name: "Executive Overview",
      category: ReportCategory.OVERVIEW,
      description: "Cross-module KPI snapshot",
    },
    {
      name: "Revenue Trends",
      category: ReportCategory.REVENUE,
      description: "Invoice revenue over time",
    },
    {
      name: "Client Portfolio",
      category: ReportCategory.CLIENTS,
      description: "Active vs inactive client growth",
    },
    {
      name: "Project Health",
      category: ReportCategory.PROJECTS,
      description: "Status distribution and progress",
    },
    {
      name: "Task Delivery",
      category: ReportCategory.TASKS,
      description: "Completion rate and backlog",
    },
    {
      name: "Attendance Summary",
      category: ReportCategory.ATTENDANCE,
      description: "Presence, late arrivals, overtime",
    },
    {
      name: "Invoice Collections",
      category: ReportCategory.INVOICES,
      description: "Paid vs overdue collections",
    },
    {
      name: "AI Business Insights",
      category: ReportCategory.AI_INSIGHTS,
      description: "AI-generated narrative from ERP metrics",
    },
  ];

  for (const template of templates) {
    const existing = await prisma.reportTemplate.findFirst({
      where: { name: template.name, deletedAt: null },
    });
    if (!existing) {
      await prisma.reportTemplate.create({
        data: {
          name: template.name,
          description: template.description,
          category: template.category,
          isSystem: true,
          createdById: admin.id,
          defaultFilters: { range: "this_month" },
        },
      });
      seedLog(`  ✓ Template ${template.name}`);
    }
  }

  const saved = await prisma.savedReport.findFirst({
    where: { name: "Monthly Executive Pack", deletedAt: null },
  });
  if (!saved) {
    await prisma.savedReport.create({
      data: {
        name: "Monthly Executive Pack",
        description: "Favorite overview for leadership review",
        category: ReportCategory.OVERVIEW,
        visibility: ReportVisibility.COMPANY,
        isFavorite: true,
        ownerId: admin.id,
        createdById: admin.id,
        updatedById: admin.id,
        filters: { range: "this_month" },
      },
    });
    seedLog("  ✓ Saved report Monthly Executive Pack");
  }
}
