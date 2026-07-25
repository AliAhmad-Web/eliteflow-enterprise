import type { PrismaClient } from "../../src/generated/client";
import {
  AttendanceStatus,
  EmployeeStatus,
  GoalStatus,
  LeaveRequestStatus,
  LeaveType,
  PerformanceRating,
} from "../../src/generated/client";

import { seedLog } from "./utils/logger";

export async function seedTeam(prisma: PrismaClient): Promise<void> {
  seedLog("Seeding team management sample data...");

  const admin = await prisma.user.findUnique({
    where: { email: "admin@eliteflow.dev" },
    select: { id: true },
  });
  const employee = await prisma.user.findUnique({
    where: { email: "employee@eliteflow.dev" },
    select: { id: true },
  });
  const superAdmin = await prisma.user.findUnique({
    where: { email: "superadmin@eliteflow.dev" },
    select: { id: true },
  });

  if (!admin || !employee) {
    seedLog("  ⚠ Demo users missing — skipping team seed");
    return;
  }

  let engineering = await prisma.department.findFirst({
    where: { code: "ENG", deletedAt: null },
  });
  if (!engineering) {
    engineering = await prisma.department.create({
      data: {
        name: "Engineering",
        code: "ENG",
        description: "Product engineering and platform delivery",
        headId: admin.id,
        createdById: admin.id,
        updatedById: admin.id,
      },
    });
    seedLog("  ✓ Created department Engineering");
  }

  let operations = await prisma.department.findFirst({
    where: { code: "OPS", deletedAt: null },
  });
  if (!operations) {
    operations = await prisma.department.create({
      data: {
        name: "Operations",
        code: "OPS",
        description: "People operations and delivery support",
        headId: admin.id,
        createdById: admin.id,
        updatedById: admin.id,
      },
    });
    seedLog("  ✓ Created department Operations");
  }

  const ensureProfile = async (args: {
    userId: string;
    code: string;
    designation: string;
    departmentId: string;
    managerId?: string | null;
    skills: string[];
  }) => {
    const existing = await prisma.employeeProfile.findUnique({
      where: { userId: args.userId },
    });
    if (existing) return existing;
    return prisma.employeeProfile.create({
      data: {
        userId: args.userId,
        employeeCode: args.code,
        designation: args.designation,
        departmentId: args.departmentId,
        managerId: args.managerId ?? null,
        status: EmployeeStatus.ACTIVE,
        hireDate: new Date("2024-01-15"),
        phone: "+1-555-0100",
        workLocation: "Remote",
        skills: args.skills,
        experienceYears: 5,
        bio: "EliteFlow team member",
        emergencyContactName: "Alex Contact",
        emergencyContactPhone: "+1-555-0199",
        emergencyContactRelation: "Spouse",
        annualLeaveBalance: 18,
        sickLeaveBalance: 8,
        documentUrls: ["https://example.com/offer-letter.pdf"],
        createdById: admin.id,
        updatedById: admin.id,
      },
    });
  };

  const adminProfile = await ensureProfile({
    userId: admin.id,
    code: "EF-001",
    designation: "Engineering Manager",
    departmentId: engineering.id,
    skills: ["Leadership", "Architecture", "TypeScript"],
  });
  const employeeProfile = await ensureProfile({
    userId: employee.id,
    code: "EF-002",
    designation: "Software Engineer",
    departmentId: engineering.id,
    managerId: admin.id,
    skills: ["React", "Node.js", "PostgreSQL"],
  });
  if (superAdmin) {
    await ensureProfile({
      userId: superAdmin.id,
      code: "EF-000",
      designation: "Chief Administrator",
      departmentId: operations.id,
      skills: ["Governance", "Security"],
    });
  }
  seedLog("  ✓ Employee profiles ready");

  let deliveryTeam = await prisma.team.findFirst({
    where: { name: "Delivery Squad", deletedAt: null },
  });
  if (!deliveryTeam) {
    deliveryTeam = await prisma.team.create({
      data: {
        name: "Delivery Squad",
        description: "Cross-functional product delivery team",
        departmentId: engineering.id,
        leaderId: admin.id,
        createdById: admin.id,
        updatedById: admin.id,
        members: {
          create: [
            { userId: admin.id, roleLabel: "Lead" },
            { userId: employee.id, roleLabel: "Engineer" },
          ],
        },
      },
    });
    seedLog("  ✓ Created team Delivery Squad");
  }

  const today = new Date();
  const todayDate = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  );
  const existingAttendance = await prisma.attendance.findUnique({
    where: {
      employeeId_date: {
        employeeId: employeeProfile.id,
        date: todayDate,
      },
    },
  });
  if (!existingAttendance) {
    const checkIn = new Date(todayDate);
    checkIn.setUTCHours(9, 12, 0, 0);
    await prisma.attendance.create({
      data: {
        employeeId: employeeProfile.id,
        date: todayDate,
        checkInAt: checkIn,
        status: AttendanceStatus.LATE,
        isLate: true,
        workingMinutes: 0,
        createdById: employee.id,
        updatedById: employee.id,
      },
    });
    const adminCheckIn = new Date(todayDate);
    adminCheckIn.setUTCHours(8, 55, 0, 0);
    await prisma.attendance.create({
      data: {
        employeeId: adminProfile.id,
        date: todayDate,
        checkInAt: adminCheckIn,
        status: AttendanceStatus.PRESENT,
        isLate: false,
        createdById: admin.id,
        updatedById: admin.id,
      },
    });
    seedLog("  ✓ Seeded today's attendance");
  }

  const pendingLeave = await prisma.leaveRequest.findFirst({
    where: {
      employeeId: employeeProfile.id,
      status: LeaveRequestStatus.PENDING,
      deletedAt: null,
    },
  });
  if (!pendingLeave) {
    const start = new Date(todayDate);
    start.setUTCDate(start.getUTCDate() + 7);
    const end = new Date(start);
    end.setUTCDate(start.getUTCDate() + 1);
    await prisma.leaveRequest.create({
      data: {
        employeeId: employeeProfile.id,
        type: LeaveType.ANNUAL,
        status: LeaveRequestStatus.PENDING,
        startDate: start,
        endDate: end,
        days: 2,
        reason: "Family event",
        createdById: employee.id,
        updatedById: employee.id,
      },
    });
    seedLog("  ✓ Created pending leave request");
  }

  const existingReview = await prisma.performanceReview.findFirst({
    where: {
      employeeId: employeeProfile.id,
      periodLabel: "2026-Q2",
      deletedAt: null,
    },
  });
  if (!existingReview) {
    await prisma.performanceReview.create({
      data: {
        employeeId: employeeProfile.id,
        reviewerId: admin.id,
        periodLabel: "2026-Q2",
        periodStart: new Date("2026-04-01"),
        periodEnd: new Date("2026-06-30"),
        rating: PerformanceRating.GOOD,
        productivityScore: 86,
        kpiSummary: "On-time delivery 92%, quality defects low.",
        notes: "Strong collaborator; ready for senior track.",
        createdById: admin.id,
        updatedById: admin.id,
      },
    });
    seedLog("  ✓ Created performance review");
  }

  const existingGoal = await prisma.employeeGoal.findFirst({
    where: {
      employeeId: employeeProfile.id,
      title: "Ship Team Module",
      deletedAt: null,
    },
  });
  if (!existingGoal) {
    await prisma.employeeGoal.create({
      data: {
        employeeId: employeeProfile.id,
        title: "Ship Team Module",
        description: "Deliver Phase 13 team management features.",
        kpiMetric: "Feature completion %",
        targetValue: "100%",
        progress: 40,
        status: GoalStatus.IN_PROGRESS,
        dueDate: new Date("2026-08-15"),
        createdById: admin.id,
        updatedById: admin.id,
      },
    });
    seedLog("  ✓ Created employee goal");
  }
}
