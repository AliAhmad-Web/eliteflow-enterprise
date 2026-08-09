import { prisma, type Prisma } from "@enterprise/database";
import {
  PERMISSIONS,
  UserRole,
  type GlobalSearchHit,
  type GlobalSearchQueryInput,
  type GlobalSearchResponse,
} from "@enterprise/shared";

export interface SearchActor {
  userId: string;
  role: string;
  email: string;
  permissions: string[];
  companyId?: string | null;
}

function hasPermission(actor: SearchActor, key: string): boolean {
  return actor.permissions.includes(key) || actor.permissions.includes("*");
}

function isAdmin(actor: SearchActor): boolean {
  return (
    actor.role === UserRole.ADMIN ||
    actor.role === UserRole.SUPER_ADMIN ||
    hasPermission(actor, PERMISSIONS.ADMIN_ACCESS)
  );
}

function isClient(actor: SearchActor): boolean {
  return actor.role === UserRole.CLIENT;
}

function hit(
  partial: Omit<GlobalSearchHit, "meta"> & { meta?: Record<string, string> },
): GlobalSearchHit {
  return partial;
}

function tokensOf(q: string): string[] {
  return q
    .trim()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0)
    .slice(0, 6);
}

function personNameWhere(q: string): Prisma.UserWhereInput {
  const tokens = tokensOf(q);
  const or: Prisma.UserWhereInput[] = [
    { firstName: { contains: q, mode: "insensitive" } },
    { lastName: { contains: q, mode: "insensitive" } },
    { email: { contains: q, mode: "insensitive" } },
    { username: { contains: q, mode: "insensitive" } },
    { designation: { contains: q, mode: "insensitive" } },
  ];

  // "Ali Ahmad" must match across first/last name, not a single column.
  if (tokens.length > 1) {
    or.push({
      AND: tokens.map((token) => ({
        OR: [
          { firstName: { contains: token, mode: "insensitive" } },
          { lastName: { contains: token, mode: "insensitive" } },
          { email: { contains: token, mode: "insensitive" } },
        ],
      })),
    });
  }

  return { OR: or };
}

async function settledHits(
  label: string,
  run: () => Promise<GlobalSearchHit[]>,
): Promise<GlobalSearchHit[]> {
  try {
    return await run();
  } catch (error) {
    console.error(`[search] ${label} failed:`, error);
    return [];
  }
}

export class SearchService {
  async search(
    input: GlobalSearchQueryInput,
    actor: SearchActor,
  ): Promise<GlobalSearchResponse> {
    const q = input.q.trim();
    const limit = input.limit;
    const scope = input.scope;
    const include = (value: GlobalSearchQueryInput["scope"]) =>
      scope === "all" || scope === value;

    const companyId =
      actor.companyId ??
      (isClient(actor)
        ? (
            await prisma.user.findUnique({
              where: { id: actor.userId },
              select: { companyId: true },
            })
          )?.companyId ?? null
        : null);

    const [
      users,
      employees,
      clients,
      projects,
      tasks,
      files,
      messages,
      notifications,
      invoices,
      calendar,
    ] = await Promise.all([
      include("users") &&
      !isClient(actor) &&
      (hasPermission(actor, PERMISSIONS.TEAM_READ) ||
        hasPermission(actor, PERMISSIONS.CHAT_READ))
        ? settledHits("users", () => this.searchUsers(q, limit))
        : Promise.resolve([] as GlobalSearchHit[]),
      include("employees") &&
      !isClient(actor) &&
      hasPermission(actor, PERMISSIONS.TEAM_READ)
        ? settledHits("employees", () => this.searchEmployees(q, limit))
        : Promise.resolve([] as GlobalSearchHit[]),
      include("clients") &&
      !isClient(actor) &&
      hasPermission(actor, PERMISSIONS.CLIENTS_READ)
        ? settledHits("clients", () => this.searchClients(q, limit))
        : Promise.resolve([] as GlobalSearchHit[]),
      include("projects") && hasPermission(actor, PERMISSIONS.PROJECTS_READ)
        ? settledHits("projects", () =>
            this.searchProjects(q, limit, actor, companyId),
          )
        : Promise.resolve([] as GlobalSearchHit[]),
      include("tasks") && hasPermission(actor, PERMISSIONS.TASKS_READ)
        ? settledHits("tasks", () =>
            this.searchTasks(q, limit, actor, companyId),
          )
        : Promise.resolve([] as GlobalSearchHit[]),
      include("files") && hasPermission(actor, PERMISSIONS.FILES_READ)
        ? settledHits("files", () =>
            this.searchFiles(q, limit, actor, companyId),
          )
        : Promise.resolve([] as GlobalSearchHit[]),
      include("messages") &&
      (hasPermission(actor, PERMISSIONS.CHAT_READ) ||
        hasPermission(actor, PERMISSIONS.COMMUNICATION_READ))
        ? settledHits("messages", () => this.searchMessages(q, limit, actor))
        : Promise.resolve([] as GlobalSearchHit[]),
      include("notifications") &&
      hasPermission(actor, PERMISSIONS.NOTIFICATIONS_READ)
        ? settledHits("notifications", () =>
            this.searchNotifications(q, limit, actor.userId),
          )
        : Promise.resolve([] as GlobalSearchHit[]),
      include("invoices") && hasPermission(actor, PERMISSIONS.INVOICES_READ)
        ? settledHits("invoices", () =>
            this.searchInvoices(q, limit, actor, companyId),
          )
        : Promise.resolve([] as GlobalSearchHit[]),
      include("calendar") && hasPermission(actor, PERMISSIONS.CALENDAR_READ)
        ? settledHits("calendar", () =>
            this.searchCalendar(q, limit, actor, companyId),
          )
        : Promise.resolve([] as GlobalSearchHit[]),
    ]);

    const groups = {
      users,
      employees,
      clients,
      projects,
      tasks,
      files,
      messages,
      notifications,
      invoices,
      calendar,
    };

    const total = Object.values(groups).reduce(
      (sum, items) => sum + items.length,
      0,
    );

    return { q, total, groups };
  }

  private async searchUsers(q: string, limit: number) {
    const rows = await prisma.user.findMany({
      where: {
        deletedAt: null,
        ...personNameWhere(q),
      },
      take: limit,
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        designation: true,
        employeeProfile: { select: { id: true } },
      },
    });

    return rows.map((row) => {
      const name = `${row.firstName} ${row.lastName}`.trim();
      return hit({
        id: row.id,
        type: "user",
        title: name,
        subtitle: row.designation
          ? `${row.email} · ${row.designation}`
          : row.email,
        href: row.employeeProfile?.id
          ? `/team?open=${encodeURIComponent(row.employeeProfile.id)}`
          : `/team?q=${encodeURIComponent(name)}`,
      });
    });
  }

  private async searchEmployees(q: string, limit: number) {
    const tokens = tokensOf(q);
    const userMatch: Prisma.UserWhereInput =
      tokens.length > 1
        ? {
            AND: tokens.map((token) => ({
              OR: [
                { firstName: { contains: token, mode: "insensitive" } },
                { lastName: { contains: token, mode: "insensitive" } },
                { email: { contains: token, mode: "insensitive" } },
              ],
            })),
          }
        : {
            OR: [
              { firstName: { contains: q, mode: "insensitive" } },
              { lastName: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          };

    const rows = await prisma.employeeProfile.findMany({
      where: {
        deletedAt: null,
        OR: [
          { employeeCode: { contains: q, mode: "insensitive" } },
          { designation: { contains: q, mode: "insensitive" } },
          { phone: { contains: q, mode: "insensitive" } },
          { companyEmail: { contains: q, mode: "insensitive" } },
          { personalEmail: { contains: q, mode: "insensitive" } },
          { user: userMatch },
        ],
      },
      take: limit,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        employeeCode: true,
        designation: true,
        user: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
    });

    return rows.map((row) =>
      hit({
        id: row.id,
        type: "employee",
        title: `${row.user.firstName} ${row.user.lastName}`.trim(),
        subtitle: [row.employeeCode, row.designation, row.user.email]
          .filter(Boolean)
          .join(" · "),
        href: `/team?open=${encodeURIComponent(row.id)}`,
      }),
    );
  }

  private async searchClients(q: string, limit: number) {
    const rows = await prisma.client.findMany({
      where: {
        deletedAt: null,
        OR: [
          { companyName: { contains: q, mode: "insensitive" } },
          { contactName: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { phone: { contains: q, mode: "insensitive" } },
        ],
      },
      take: limit,
      orderBy: { companyName: "asc" },
      select: {
        id: true,
        companyName: true,
        contactName: true,
        email: true,
        status: true,
      },
    });

    return rows.map((row) =>
      hit({
        id: row.id,
        type: "client",
        title: row.companyName,
        subtitle: [row.contactName, row.email, row.status]
          .filter(Boolean)
          .join(" · "),
        href: `/clients?open=${encodeURIComponent(row.id)}`,
      }),
    );
  }

  private async searchProjects(
    q: string,
    limit: number,
    actor: SearchActor,
    companyId: string | null,
  ) {
    const where: Prisma.ProjectWhereInput = {
      deletedAt: null,
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        {
          client: {
            companyName: { contains: q, mode: "insensitive" },
          },
        },
      ],
    };

    if (!isAdmin(actor)) {
      if (isClient(actor)) {
        if (!companyId) return [];
        where.clientId = companyId;
      } else {
        where.members = { some: { userId: actor.userId } };
      }
    }

    const rows = await prisma.project.findMany({
      where,
      take: limit,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        status: true,
        client: { select: { companyName: true } },
      },
    });

    return rows.map((row) =>
      hit({
        id: row.id,
        type: "project",
        title: row.name,
        subtitle: [row.client?.companyName, row.status]
          .filter(Boolean)
          .join(" · "),
        href: `/projects?open=${encodeURIComponent(row.id)}`,
      }),
    );
  }

  private async searchTasks(
    q: string,
    limit: number,
    actor: SearchActor,
    companyId: string | null,
  ) {
    const textMatch: Prisma.TaskWhereInput = {
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ],
    };

    const where: Prisma.TaskWhereInput = {
      deletedAt: null,
      ...textMatch,
    };

    if (!isAdmin(actor)) {
      if (isClient(actor)) {
        if (!companyId) return [];
        where.AND = [
          textMatch,
          { project: { clientId: companyId, deletedAt: null } },
        ];
        delete where.OR;
      } else {
        where.AND = [
          textMatch,
          {
            OR: [
              { assignedToId: actor.userId },
              {
                project: {
                  members: { some: { userId: actor.userId } },
                },
              },
            ],
          },
        ];
        delete where.OR;
      }
    }

    const rows = await prisma.task.findMany({
      where,
      take: limit,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        status: true,
        project: { select: { name: true } },
      },
    });

    return rows.map((row) =>
      hit({
        id: row.id,
        type: "task",
        title: row.title,
        subtitle: [row.project?.name, row.status].filter(Boolean).join(" · "),
        href: `/tasks?open=${encodeURIComponent(row.id)}`,
      }),
    );
  }

  private async searchFiles(
    q: string,
    limit: number,
    actor: SearchActor,
    companyId: string | null,
  ) {
    const memberships =
      !isAdmin(actor) && !isClient(actor)
        ? await prisma.projectMember.findMany({
            where: { userId: actor.userId },
            select: { projectId: true },
          })
        : [];
    const projectIds = memberships.map((item) => item.projectId);

    const scope: Prisma.ManagedFileWhereInput = isAdmin(actor)
      ? {}
      : isClient(actor)
        ? {
            OR: [
              { createdById: actor.userId },
              ...(companyId ? [{ clientId: companyId }] : []),
            ],
          }
        : {
            OR: [
              { createdById: actor.userId },
              ...(projectIds.length
                ? [{ projectId: { in: projectIds } }]
                : []),
              {
                shares: {
                  some: {
                    sharedWithUserId: actor.userId,
                    OR: [
                      { expiresAt: null },
                      { expiresAt: { gt: new Date() } },
                    ],
                  },
                },
              },
            ],
          };

    const rows = await prisma.managedFile.findMany({
      where: {
        deletedAt: null,
        AND: [
          scope,
          {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { originalName: { contains: q, mode: "insensitive" } },
            ],
          },
        ],
      },
      take: limit,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        originalName: true,
        mimeType: true,
        category: true,
      },
    });

    return rows.map((row) =>
      hit({
        id: row.id,
        type: "file",
        title: row.name || row.originalName,
        subtitle: [row.category, row.mimeType].filter(Boolean).join(" · "),
        href: `/files/${row.id}`,
      }),
    );
  }

  private async searchMessages(q: string, limit: number, actor: SearchActor) {
    const orgWide = isAdmin(actor) && !isClient(actor);
    const rows = await prisma.message.findMany({
      where: {
        deletedAt: null,
        AND: [
          {
            conversation: {
              deletedAt: null,
              ...(orgWide
                ? {}
                : {
                    members: {
                      some: { userId: actor.userId, deletedAt: null },
                    },
                  }),
            },
          },
          {
            OR: [
              { body: { contains: q, mode: "insensitive" } },
              {
                conversation: {
                  name: { contains: q, mode: "insensitive" },
                },
              },
            ],
          },
        ],
      },
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        body: true,
        conversationId: true,
        conversation: { select: { name: true, type: true } },
        sender: { select: { firstName: true, lastName: true } },
      },
    });

    return rows.map((row) => {
      const preview = row.body.replace(/\s+/g, " ").trim().slice(0, 80);
      const sender =
        `${row.sender?.firstName ?? ""} ${row.sender?.lastName ?? ""}`.trim();
      return hit({
        id: row.id,
        type: "message",
        title: preview || row.conversation?.name || "Message",
        subtitle: [row.conversation?.name || "Conversation", sender]
          .filter(Boolean)
          .join(" · "),
        href: `/messages?c=${row.conversationId}`,
      });
    });
  }

  private async searchNotifications(q: string, limit: number, userId: string) {
    const rows = await prisma.notification.findMany({
      where: {
        userId,
        deletedAt: null,
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { body: { contains: q, mode: "insensitive" } },
        ],
      },
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        body: true,
        category: true,
      },
    });

    return rows.map((row) =>
      hit({
        id: row.id,
        type: "notification",
        title: row.title,
        subtitle:
          row.body?.replace(/\s+/g, " ").trim().slice(0, 80) || row.category,
        href: `/notifications/${row.id}`,
      }),
    );
  }

  private async searchInvoices(
    q: string,
    limit: number,
    actor: SearchActor,
    companyId: string | null,
  ) {
    const where: Prisma.InvoiceWhereInput = {
      deletedAt: null,
      OR: [
        { invoiceNumber: { contains: q, mode: "insensitive" } },
        { notes: { contains: q, mode: "insensitive" } },
        {
          client: {
            companyName: { contains: q, mode: "insensitive" },
          },
        },
        {
          project: {
            name: { contains: q, mode: "insensitive" },
          },
        },
      ],
    };

    if (!isAdmin(actor)) {
      if (isClient(actor)) {
        if (!companyId) return [];
        where.clientId = companyId;
      }
    }

    const rows = await prisma.invoice.findMany({
      where,
      take: limit,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        invoiceNumber: true,
        status: true,
        total: true,
        currency: true,
        client: { select: { companyName: true } },
      },
    });

    return rows.map((row) =>
      hit({
        id: row.id,
        type: "invoice",
        title: row.invoiceNumber,
        subtitle: [
          row.client?.companyName,
          row.status,
          `${row.currency} ${String(row.total)}`,
        ]
          .filter(Boolean)
          .join(" · "),
        href: `/invoices?q=${encodeURIComponent(row.invoiceNumber)}`,
      }),
    );
  }

  private async searchCalendar(
    q: string,
    limit: number,
    actor: SearchActor,
    companyId: string | null,
  ) {
    const where: Prisma.CalendarEventWhereInput = {
      deletedAt: null,
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { location: { contains: q, mode: "insensitive" } },
        { notes: { contains: q, mode: "insensitive" } },
      ],
    };

    if (!isAdmin(actor)) {
      if (isClient(actor)) {
        if (!companyId) return [];
        where.AND = [
          {
            OR: [
              { clientId: companyId },
              { createdById: actor.userId },
              { attendees: { some: { userId: actor.userId } } },
            ],
          },
        ];
      } else {
        where.AND = [
          {
            OR: [
              { createdById: actor.userId },
              { attendees: { some: { userId: actor.userId } } },
              { isPrivate: false },
            ],
          },
        ];
      }
    }

    const rows = await prisma.calendarEvent.findMany({
      where,
      take: limit,
      orderBy: { startsAt: "desc" },
      select: {
        id: true,
        title: true,
        startsAt: true,
        location: true,
        type: true,
      },
    });

    return rows.map((row) =>
      hit({
        id: row.id,
        type: "calendar",
        title: row.title,
        subtitle: [
          row.type,
          row.location,
          row.startsAt.toISOString().slice(0, 10),
        ]
          .filter(Boolean)
          .join(" · "),
        href: `/calendar?q=${encodeURIComponent(row.title)}`,
      }),
    );
  }
}

export const searchService = new SearchService();
