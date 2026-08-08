import {
  prisma,
  type AppLanguage,
  type BackupStatus,
  type BackupType,
  type BorderRadiusPreference,
  type DashboardDensity,
  type FontSizePreference,
  type IntegrationProvider,
  type SidebarStyle,
  type ThemeModePreference,
} from "@enterprise/database";

import { SETTINGS_ORG_KEY } from "./settings.constants.js";

export const settingsRepository = {
  async findUserProfile(userId: string) {
    return prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      include: {
        role: { select: { id: true, code: true, name: true } },
        employeeProfile: {
          include: { department: { select: { name: true } } },
        },
      },
    });
  },

  async findUsernameOwner(username: string, excludeUserId: string) {
    return prisma.user.findFirst({
      where: {
        username: { equals: username, mode: "insensitive" },
        id: { not: excludeUserId },
        deletedAt: null,
      },
      select: { id: true },
    });
  },

  async updateUserProfile(
    userId: string,
    data: {
      firstName: string;
      lastName: string;
      username?: string | null;
      avatarUrl?: string | null;
      phone?: string | null;
      bio?: string | null;
      designation?: string | null;
      address?: string | null;
      city?: string | null;
      country?: string | null;
      dateOfBirth?: Date | null;
    },
  ) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        username: data.username === undefined ? undefined : data.username,
        avatarUrl: data.avatarUrl === undefined ? undefined : data.avatarUrl,
        phone: data.phone === undefined ? undefined : data.phone,
        bio: data.bio === undefined ? undefined : data.bio,
        designation:
          data.designation === undefined ? undefined : data.designation,
        address: data.address === undefined ? undefined : data.address,
        city: data.city === undefined ? undefined : data.city,
        country: data.country === undefined ? undefined : data.country,
        dateOfBirth:
          data.dateOfBirth === undefined ? undefined : data.dateOfBirth,
      },
      include: {
        role: { select: { id: true, code: true, name: true } },
        employeeProfile: {
          include: { department: { select: { name: true } } },
        },
      },
    });
  },

  async syncEmployeePersonalFields(
    userId: string,
    data: {
      phone?: string | null;
      designation?: string | null;
      address?: string | null;
      city?: string | null;
      country?: string | null;
      dateOfBirth?: Date | null;
      personalEmail?: string | null;
      workLocation?: string | null;
      photoUrl?: string | null;
    },
  ) {
    const profile = await prisma.employeeProfile.findFirst({
      where: { userId, deletedAt: null },
      select: { id: true },
    });
    if (!profile) return null;

    return prisma.employeeProfile.update({
      where: { id: profile.id },
      data: {
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
        ...(data.designation !== undefined
          ? { designation: data.designation }
          : {}),
        ...(data.address !== undefined ? { address: data.address } : {}),
        ...(data.city !== undefined ? { city: data.city } : {}),
        ...(data.country !== undefined ? { country: data.country } : {}),
        ...(data.dateOfBirth !== undefined
          ? { dateOfBirth: data.dateOfBirth }
          : {}),
        ...(data.personalEmail !== undefined
          ? { personalEmail: data.personalEmail }
          : {}),
        ...(data.workLocation !== undefined
          ? { workLocation: data.workLocation }
          : {}),
        ...(data.photoUrl !== undefined ? { photoUrl: data.photoUrl } : {}),
        updatedById: userId,
      },
    });
  },

  async listProfileManagedFiles(userId: string, tag: string) {
    return prisma.managedFile.findMany({
      where: {
        createdById: userId,
        deletedAt: null,
        tags: { has: tag },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async findOwnedManagedFile(userId: string, fileId: string) {
    return prisma.managedFile.findFirst({
      where: {
        id: fileId,
        createdById: userId,
        deletedAt: null,
      },
    });
  },

  async softDeleteManagedFile(fileId: string, userId: string) {
    return prisma.managedFile.update({
      where: { id: fileId },
      data: { deletedAt: new Date(), updatedById: userId },
    });
  },

  async createEmployeeDocumentForSelf(input: {
    employeeId: string;
    type: string;
    title: string;
    fileUrl: string;
    fileName: string | null;
    mimeType: string | null;
    fileSize: number | null;
    notes: string | null;
    uploadedById: string;
  }) {
    return prisma.employeeDocument.create({
      data: {
        employeeId: input.employeeId,
        type: input.type as never,
        title: input.title,
        fileUrl: input.fileUrl,
        fileName: input.fileName,
        mimeType: input.mimeType,
        fileSize: input.fileSize,
        notes: input.notes,
        uploadedById: input.uploadedById,
      },
    });
  },

  async softDeleteEmployeeDocumentByFileUrl(fileUrl: string, userId: string) {
    const docs = await prisma.employeeDocument.findMany({
      where: {
        fileUrl,
        deletedAt: null,
        employee: { userId, deletedAt: null },
      },
      select: { id: true },
    });
    if (!docs.length) return;
    await prisma.employeeDocument.updateMany({
      where: { id: { in: docs.map((d) => d.id) } },
      data: { deletedAt: new Date() },
    });
  },

  async getOrCreatePreferences(userId: string) {
    const existing = await prisma.userPreference.findUnique({
      where: { userId },
    });
    if (existing) return existing;
    return prisma.userPreference.create({
      data: { userId },
    });
  },

  async updatePreferences(
    userId: string,
    data: Partial<{
      themeMode: ThemeModePreference;
      sidebarStyle: SidebarStyle;
      compactMode: boolean;
      fontSize: FontSizePreference;
      borderRadius: BorderRadiusPreference;
      accentColor: string | null;
      dashboardDensity: DashboardDensity;
      language: AppLanguage;
      timezone: string;
      currency: string;
      dateFormat: string;
      timeFormat: string;
      emailNotifications: boolean;
      pushNotifications: boolean;
      desktopNotifications: boolean;
      smsNotifications: boolean;
      whatsappNotifications: boolean;
      aiProvider: string | null;
      aiModel: string | null;
      aiTemperature: number | null;
      aiMaxTokens: number | null;
      aiHistoryEnabled: boolean;
      aiPrivacyMode: boolean;
      twoFactorPreferred: boolean;
      sessionTimeoutMinutes: number;
      loginAlertsEnabled: boolean;
      deviceTrustEnabled: boolean;
      passwordPolicyStrict: boolean;
    }>,
  ) {
    await this.getOrCreatePreferences(userId);
    return prisma.userPreference.update({
      where: { userId },
      data,
    });
  },

  async resetPreferences(userId: string) {
    await prisma.userPreference.deleteMany({ where: { userId } });
    return this.getOrCreatePreferences(userId);
  },

  async getOrCreateOrganization() {
    const existing = await prisma.organizationSettings.findUnique({
      where: { key: SETTINGS_ORG_KEY },
    });
    if (existing) return existing;
    return prisma.organizationSettings.create({
      data: {
        key: SETTINGS_ORG_KEY,
        companyName: "EliteFlow",
        currency: "USD",
        timezone: "UTC",
      },
    });
  },

  async updateOrganization(
    data: Parameters<typeof prisma.organizationSettings.update>[0]["data"],
  ) {
    await this.getOrCreateOrganization();
    return prisma.organizationSettings.update({
      where: { key: SETTINGS_ORG_KEY },
      data,
    });
  },

  async listCredentials() {
    return prisma.integrationCredential.findMany({
      where: { deletedAt: null },
      orderBy: [{ provider: "asc" }, { label: "asc" }],
    });
  },

  async findCredential(id: string) {
    return prisma.integrationCredential.findFirst({
      where: { id, deletedAt: null },
    });
  },

  async createCredential(input: {
    provider: IntegrationProvider;
    label: string;
    encryptedSecret: string;
    iv: string;
    authTag: string;
    secretLast4: string;
    createdById: string;
  }) {
    return prisma.integrationCredential.create({
      data: {
        provider: input.provider,
        label: input.label,
        encryptedSecret: input.encryptedSecret,
        iv: input.iv,
        authTag: input.authTag,
        secretLast4: input.secretLast4,
        createdById: input.createdById,
        lastRotatedAt: new Date(),
      },
    });
  },

  async updateCredential(
    id: string,
    data: {
      label?: string;
      encryptedSecret?: string;
      iv?: string;
      authTag?: string;
      secretLast4?: string;
      isActive?: boolean;
      updatedById: string;
      lastRotatedAt?: Date;
    },
  ) {
    return prisma.integrationCredential.update({
      where: { id },
      data,
    });
  },

  async softDeleteCredential(id: string, updatedById: string) {
    return prisma.integrationCredential.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
        updatedById,
      },
    });
  },

  async listBackups(take = 50) {
    return prisma.backupRecord.findMany({
      orderBy: { createdAt: "desc" },
      take,
    });
  },

  async createBackup(input: {
    type: BackupType;
    triggeredBy: string;
  }) {
    return prisma.backupRecord.create({
      data: {
        type: input.type,
        status: "PENDING",
        triggeredBy: input.triggeredBy,
        startedAt: new Date(),
        message: "Backup queued",
      },
    });
  },

  async completeBackup(
    id: string,
    data: {
      status: BackupStatus;
      storageKey?: string;
      sizeBytes?: bigint;
      checksum?: string;
      message?: string;
    },
  ) {
    return prisma.backupRecord.update({
      where: { id },
      data: {
        ...data,
        completedAt: new Date(),
      },
    });
  },

  async findBackup(id: string) {
    return prisma.backupRecord.findUnique({ where: { id } });
  },

  async getOrCreateBilling() {
    const existing = await prisma.organizationBilling.findUnique({
      where: { key: SETTINGS_ORG_KEY },
    });
    if (existing) return existing;
    const now = new Date();
    const end = new Date(now);
    end.setMonth(end.getMonth() + 1);
    return prisma.organizationBilling.create({
      data: {
        key: SETTINGS_ORG_KEY,
        planCode: "professional",
        planName: "Professional",
        status: "ACTIVE",
        seatsIncluded: 25,
        seatsUsed: 4,
        storageQuotaBytes: BigInt(50 * 1024 * 1024 * 1024),
        storageUsedBytes: BigInt(0),
        aiCreditsIncluded: 5000,
        aiCreditsUsed: 120,
        currentPeriodStart: now,
        currentPeriodEnd: end,
      },
    });
  },

  async updateBilling(data: { billingEmail?: string | null }) {
    await this.getOrCreateBilling();
    return prisma.organizationBilling.update({
      where: { key: SETTINGS_ORG_KEY },
      data,
    });
  },

  async countUsers(): Promise<number> {
    return prisma.user.count({ where: { deletedAt: null } });
  },

  async storageStats() {
    const aggregate = await prisma.managedFile.aggregate({
      where: { deletedAt: null },
      _sum: { sizeBytes: true },
      _count: { _all: true },
    });
    return {
      usedBytes: aggregate._sum.sizeBytes ?? BigInt(0),
      fileCount: aggregate._count._all,
    };
  },

  async createDeletionRequest(input: {
    userId: string;
    reason?: string;
  }) {
    return prisma.accountDeletionRequest.create({
      data: {
        userId: input.userId,
        reason: input.reason ?? null,
        status: "PENDING",
      },
    });
  },
};
