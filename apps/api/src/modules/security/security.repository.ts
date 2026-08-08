import {
  prisma,
  Prisma,
  type SecurityEventCategory,
  type SecurityIncidentStatus,
  type SecuritySeverity,
} from "@enterprise/database";
import { sanitizeAuditMetadata } from "@enterprise/shared";

export const securityRepository = {
  async countActiveSessions(userId?: string): Promise<number> {
    return prisma.session.count({
      where: {
        revokedAt: null,
        ...(userId ? { userId } : {}),
      },
    });
  },

  async countLoginAttempts(input: {
    since: Date;
    success?: boolean;
    userId?: string;
  }): Promise<number> {
    return prisma.loginAttempt.count({
      where: {
        createdAt: { gte: input.since },
        ...(input.success === undefined ? {} : { success: input.success }),
        ...(input.userId ? { userId: input.userId } : {}),
      },
    });
  },

  async countLockedAccounts(): Promise<number> {
    return prisma.user.count({
      where: {
        deletedAt: null,
        OR: [
          { status: "LOCKED" },
          { lockedUntil: { gt: new Date() } },
        ],
      },
    });
  },

  async countUnresolvedAlerts(): Promise<number> {
    return prisma.securityEvent.count({
      where: { resolvedAt: null },
    });
  },

  async countAuditEvents(since: Date): Promise<number> {
    return prisma.auditLog.count({
      where: { createdAt: { gte: since } },
    });
  },

  async findUserSecurityProfile(userId: string) {
    return prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        passwordChangedAt: true,
        mustChangePassword: true,
        lastLoginAt: true,
        twoFactorEnabled: true,
        failedLoginCount: true,
        lockedUntil: true,
        status: true,
      },
    });
  },

  async countPasswordHistory(userId: string): Promise<number> {
    return prisma.passwordHistory.count({ where: { userId } });
  },

  async listPasswordHistory(userId: string, take = 20) {
    return prisma.passwordHistory.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take,
      select: { id: true, createdAt: true },
    });
  },

  async listRecentLogins(input: {
    take: number;
    userId?: string;
  }) {
    return prisma.loginAttempt.findMany({
      where: input.userId ? { userId: input.userId } : undefined,
      orderBy: { createdAt: "desc" },
      take: input.take,
    });
  },

  async listLoginHistory(input: {
    skip: number;
    take: number;
    email?: string;
    userId?: string;
    success?: boolean;
    from?: Date;
    to?: Date;
  }) {
    const where: Prisma.LoginAttemptWhereInput = {
      ...(input.email
        ? { email: { contains: input.email, mode: "insensitive" } }
        : {}),
      ...(input.userId ? { userId: input.userId } : {}),
      ...(input.success === undefined ? {} : { success: input.success }),
      ...(input.from || input.to
        ? {
            createdAt: {
              ...(input.from ? { gte: input.from } : {}),
              ...(input.to ? { lte: input.to } : {}),
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.loginAttempt.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: input.skip,
        take: input.take,
      }),
      prisma.loginAttempt.count({ where }),
    ]);

    return { items, total };
  },

  async listActiveSessions(input: {
    skip: number;
    take: number;
    userId?: string;
    search?: string;
  }) {
    const where: Prisma.SessionWhereInput = {
      revokedAt: null,
      ...(input.userId ? { userId: input.userId } : {}),
      ...(input.search
        ? {
            OR: [
              {
                deviceName: {
                  contains: input.search,
                  mode: "insensitive",
                },
              },
              {
                ipAddress: {
                  contains: input.search,
                  mode: "insensitive",
                },
              },
              {
                user: {
                  email: {
                    contains: input.search,
                    mode: "insensitive",
                  },
                },
              },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.session.findMany({
        where,
        orderBy: { lastActiveAt: "desc" },
        skip: input.skip,
        take: input.take,
        include: {
          user: {
            select: {
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      prisma.session.count({ where }),
    ]);

    return { items, total };
  },

  async findActiveSession(sessionId: string) {
    return prisma.session.findFirst({
      where: { id: sessionId, revokedAt: null },
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });
  },

  async listAuditLogs(input: {
    skip: number;
    take: number;
    search?: string;
    action?: string;
    resource?: string;
    userId?: string;
    from?: Date;
    to?: Date;
  }) {
    const where: Prisma.AuditLogWhereInput = {
      ...(input.action
        ? { action: { contains: input.action, mode: "insensitive" } }
        : {}),
      ...(input.resource
        ? { resource: { contains: input.resource, mode: "insensitive" } }
        : {}),
      ...(input.userId ? { userId: input.userId } : {}),
      ...(input.from || input.to
        ? {
            createdAt: {
              ...(input.from ? { gte: input.from } : {}),
              ...(input.to ? { lte: input.to } : {}),
            },
          }
        : {}),
      ...(input.search
        ? {
            OR: [
              { action: { contains: input.search, mode: "insensitive" } },
              { resource: { contains: input.search, mode: "insensitive" } },
              {
                user: {
                  email: { contains: input.search, mode: "insensitive" },
                },
              },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: input.skip,
        take: input.take,
        include: {
          user: {
            select: { email: true, firstName: true, lastName: true },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { items, total };
  },

  async listSecurityEvents(input: {
    skip: number;
    take: number;
    severity?: SecuritySeverity;
    category?: SecurityEventCategory;
    unresolvedOnly?: boolean;
    userId?: string;
  }) {
    const where: Prisma.SecurityEventWhereInput = {
      ...(input.severity ? { severity: input.severity } : {}),
      ...(input.category ? { category: input.category } : {}),
      ...(input.unresolvedOnly ? { resolvedAt: null } : {}),
      ...(input.userId ? { userId: input.userId } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.securityEvent.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: input.skip,
        take: input.take,
        include: {
          user: {
            select: { email: true },
          },
        },
      }),
      prisma.securityEvent.count({ where }),
    ]);

    return { items, total };
  },

  async findSecurityEvent(eventId: string) {
    return prisma.securityEvent.findUnique({ where: { id: eventId } });
  },

  async resolveSecurityEvent(eventId: string) {
    return prisma.securityEvent.update({
      where: { id: eventId },
      data: { resolvedAt: new Date() },
      include: { user: { select: { email: true } } },
    });
  },

  async listSecurityIncidents(input: {
    skip: number;
    take: number;
    severity?: SecuritySeverity;
    status?: SecurityIncidentStatus;
    type?: string;
    unresolvedOnly?: boolean;
  }) {
    const where: Prisma.SecurityIncidentWhereInput = {
      ...(input.severity ? { severity: input.severity } : {}),
      ...(input.status ? { status: input.status } : {}),
      ...(input.type
        ? { type: { contains: input.type, mode: "insensitive" } }
        : {}),
      ...(input.unresolvedOnly
        ? { status: { in: ["OPEN", "INVESTIGATING"] } }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.securityIncident.findMany({
        where,
        orderBy: { lastSeenAt: "desc" },
        skip: input.skip,
        take: input.take,
      }),
      prisma.securityIncident.count({ where }),
    ]);

    return { items, total };
  },

  async findSecurityIncident(incidentId: string) {
    return prisma.securityIncident.findUnique({ where: { id: incidentId } });
  },

  async createSecurityEvent(input: {
    userId?: string | null;
    severity: SecuritySeverity;
    category: SecurityEventCategory;
    eventType: string;
    message: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string | null;
    userAgent?: string | null;
  }) {
    return prisma.securityEvent.create({
      data: {
        userId: input.userId ?? null,
        severity: input.severity,
        category: input.category,
        eventType: input.eventType,
        message: input.message,
        metadata: input.metadata
          ? ((sanitizeAuditMetadata(input.metadata) ??
              undefined) as Prisma.InputJsonValue)
          : undefined,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      },
    });
  },

  async unlockUser(userId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginCount: 0,
        lockedUntil: null,
        status: "ACTIVE",
      },
      select: {
        id: true,
        email: true,
        lockedUntil: true,
        status: true,
      },
    });
  },

  async updateUserPassword(userId: string, passwordHash: string) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        passwordChangedAt: new Date(),
        mustChangePassword: false,
        failedLoginCount: 0,
        lockedUntil: null,
      },
      select: {
        id: true,
        passwordChangedAt: true,
      },
    });
  },
};
