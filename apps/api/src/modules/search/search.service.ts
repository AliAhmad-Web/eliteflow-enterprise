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

function isSuperAdmin(actor: SearchActor): boolean {
  return actor.role === UserRole.SUPER_ADMIN;
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

/** Org-wide HR/people directory (aligned with team.service listEmployees). */
function canBrowsePeopleDirectory(actor: SearchActor): boolean {
  return (
    isAdmin(actor) ||
    hasPermission(actor, PERMISSIONS.TEAM_MANAGE) ||
    hasPermission(actor, PERMISSIONS.USERS_MANAGE)
  );
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

    const empty: GlobalSearchHit[] = [];

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
      departments,
      teams,
      leave,
      reports,
      aiDocuments,
      announcements,
    ] = await Promise.all([
      include("users") &&
      !isClient(actor) &&
      (hasPermission(actor, PERMISSIONS.TEAM_READ) ||
        hasPermission(actor, PERMISSIONS.CHAT_READ))
        ? settledHits("users", () => this.searchUsers(q, limit, actor))
        : Promise.resolve(empty),
      include("employees") &&
      !isClient(actor) &&
      hasPermission(actor, PERMISSIONS.TEAM_READ)
        ? settledHits("employees", () => this.searchEmployees(q, limit, actor))
        : Promise.resolve(empty),
      include("clients") &&
      !isClient(actor) &&
      hasPermission(actor, PERMISSIONS.CLIENTS_READ)
        ? settledHits("clients", () => this.searchClients(q, limit))
        : Promise.resolve(empty),
      include("projects") && hasPermission(actor, PERMISSIONS.PROJECTS_READ)
        ? settledHits("projects", () =>
            this.searchProjects(q, limit, actor, companyId),
          )
        : Promise.resolve(empty),
      include("tasks") && hasPermission(actor, PERMISSIONS.TASKS_READ)
        ? settledHits("tasks", () =>
            this.searchTasks(q, limit, actor, companyId),
          )
        : Promise.resolve(empty),
      include("files") && hasPermission(actor, PERMISSIONS.FILES_READ)
        ? settledHits("files", () =>
            this.searchFiles(q, limit, actor, companyId),
          )
        : Promise.resolve(empty),
      include("messages") &&
      (hasPermission(actor, PERMISSIONS.CHAT_READ) ||
        hasPermission(actor, PERMISSIONS.COMMUNICATION_READ))
        ? settledHits("messages", () => this.searchMessages(q, limit, actor))
        : Promise.resolve(empty),
      include("notifications") &&
      hasPermission(actor, PERMISSIONS.NOTIFICATIONS_READ)
        ? settledHits("notifications", () =>
            this.searchNotifications(q, limit, actor.userId),
          )
        : Promise.resolve(empty),
      include("invoices") && hasPermission(actor, PERMISSIONS.INVOICES_READ)
        ? settledHits("invoices", () =>
            this.searchInvoices(q, limit, actor, companyId),
          )
        : Promise.resolve(empty),
      include("calendar") && hasPermission(actor, PERMISSIONS.CALENDAR_READ)
        ? settledHits("calendar", () =>
            this.searchCalendar(q, limit, actor, companyId),
          )
        : Promise.resolve(empty),
      include("departments") &&
      !isClient(actor) &&
      hasPermission(actor, PERMISSIONS.TEAM_READ)
        ? settledHits("departments", () => this.searchDepartments(q, limit))
        : Promise.resolve(empty),
      include("teams") &&
      !isClient(actor) &&
      hasPermission(actor, PERMISSIONS.TEAM_READ)
        ? settledHits("teams", () => this.searchTeams(q, limit, actor))
        : Promise.resolve(empty),
      include("leave") &&
      !isClient(actor) &&
      hasPermission(actor, PERMISSIONS.TEAM_READ)
        ? settledHits("leave", () => this.searchLeave(q, limit, actor))
        : Promise.resolve(empty),
      include("reports") && hasPermission(actor, PERMISSIONS.REPORTS_READ)
        ? settledHits("reports", () => this.searchReports(q, limit, actor))
        : Promise.resolve(empty),
      include("aiDocuments") && hasPermission(actor, PERMISSIONS.AI_USE)
        ? settledHits("aiDocuments", () =>
            this.searchAiDocuments(q, limit, actor),
          )
        : Promise.resolve(empty),
      include("announcements") &&
      (hasPermission(actor, PERMISSIONS.COMMUNICATION_READ) ||
        hasPermission(actor, PERMISSIONS.CHAT_READ))
        ? settledHits("announcements", () =>
            this.searchAnnouncements(q, limit, actor),
          )
        : Promise.resolve(empty),
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
      departments,
      teams,
      leave,
      reports,
      aiDocuments,
      announcements,
    };

    const total = Object.values(groups).reduce(
      (sum, items) => sum + items.length,
      0,
    );

    return { q, total, groups };
  }

  private async searchUsers(q: string, limit: number, actor: SearchActor) {
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...personNameWhere(q),
    };

    if (!canBrowsePeopleDirectory(actor)) {
      where.id = actor.userId;
    }

    const rows = await prisma.user.findMany({
      where,
      take: limit,
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        designation: true,
        role: { select: { name: true, code: true } },
        employeeProfile: {
          select: {
            id: true,
            department: { select: { name: true } },
          },
        },
      },
    });

    return rows.map((row) => {
      const name = `${row.firstName} ${row.lastName}`.trim();
      return hit({
        id: row.id,
        type: "user",
        title: name,
        subtitle: [
          row.email,
          row.role?.name,
          row.designation,
          row.employeeProfile?.department?.name,
        ]
          .filter(Boolean)
          .join(" · "),
        href: row.employeeProfile?.id
          ? `/team?open=${encodeURIComponent(row.employeeProfile.id)}`
          : `/team?q=${encodeURIComponent(name)}`,
        meta: { role: row.role?.code ?? "" },
      });
    });
  }

  private async searchEmployees(q: string, limit: number, actor: SearchActor) {
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

    const where: Prisma.EmployeeProfileWhereInput = {
      deletedAt: null,
      OR: [
        { employeeCode: { contains: q, mode: "insensitive" } },
        { designation: { contains: q, mode: "insensitive" } },
        { phone: { contains: q, mode: "insensitive" } },
        { companyEmail: { contains: q, mode: "insensitive" } },
        { personalEmail: { contains: q, mode: "insensitive" } },
        { department: { name: { contains: q, mode: "insensitive" } } },
        { user: userMatch },
      ],
    };

    if (!canBrowsePeopleDirectory(actor)) {
      where.userId = actor.userId;
    }

    const rows = await prisma.employeeProfile.findMany({
      where,
      take: limit,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        employeeCode: true,
        designation: true,
        department: { select: { name: true } },
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            role: { select: { name: true } },
          },
        },
      },
    });

    return rows.map((row) =>
      hit({
        id: row.id,
        type: "employee",
        title: `${row.user.firstName} ${row.user.lastName}`.trim(),
        subtitle: [
          row.employeeCode,
          row.designation,
          row.department?.name,
          row.user.role?.name,
          row.user.email,
        ]
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
        { client: { companyName: { contains: q, mode: "insensitive" } } },
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
      AND: [textMatch],
    };

    if (!isAdmin(actor)) {
      if (isClient(actor)) {
        if (!companyId) return [];
        where.AND = [
          textMatch,
          { project: { clientId: companyId, deletedAt: null } },
        ];
      } else {
        // Align with tasks.service: employees see assigned tasks only.
        where.AND = [textMatch, { assignedToId: actor.userId }];
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
              ...(companyId
                ? [
                    {
                      shares: {
                        some: {
                          sharedWithClientId: companyId,
                          OR: [
                            { expiresAt: null },
                            { expiresAt: { gt: new Date() } },
                          ],
                        },
                      },
                    },
                  ]
                : []),
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
        href: `/messages?c=${encodeURIComponent(row.conversationId)}`,
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
        { client: { companyName: { contains: q, mode: "insensitive" } } },
        { project: { name: { contains: q, mode: "insensitive" } } },
      ],
    };

    // Invoices service: Admin + Employee see all; Client scoped to company.
    if (isClient(actor)) {
      if (!companyId) return [];
      where.clientId = companyId;
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
        href: `/invoices?open=${encodeURIComponent(row.id)}`,
      }),
    );
  }

  private async searchCalendar(
    q: string,
    limit: number,
    actor: SearchActor,
    companyId: string | null,
  ) {
    const textMatch: Prisma.CalendarEventWhereInput = {
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { location: { contains: q, mode: "insensitive" } },
        { notes: { contains: q, mode: "insensitive" } },
      ],
    };

    const where: Prisma.CalendarEventWhereInput = {
      deletedAt: null,
      AND: [textMatch],
    };

    if (!isAdmin(actor)) {
      if (isClient(actor)) {
        if (!companyId) return [];
        where.AND = [
          textMatch,
          { isPrivate: false },
          {
            OR: [
              { clientId: companyId },
              { attendees: { some: { userId: actor.userId } } },
            ],
          },
        ];
      } else {
        where.AND = [
          textMatch,
          {
            OR: [
              { createdById: actor.userId },
              { attendees: { some: { userId: actor.userId } } },
              {
                AND: [
                  { isPrivate: false },
                  {
                    type: {
                      in: ["MEETING", "EVENT", "PROJECT_DEADLINE", "HOLIDAY"],
                    },
                  },
                ],
              },
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
        href: `/calendar?open=${encodeURIComponent(row.id)}`,
      }),
    );
  }

  private async searchDepartments(q: string, limit: number) {
    const rows = await prisma.department.findMany({
      where: {
        deletedAt: null,
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { code: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ],
      },
      take: limit,
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        _count: { select: { employees: true } },
      },
    });

    return rows.map((row) =>
      hit({
        id: row.id,
        type: "department",
        title: row.name,
        subtitle: [row.code, `${row._count.employees} people`, row.description]
          .filter(Boolean)
          .join(" · ")
          .slice(0, 120),
        href: `/team?q=${encodeURIComponent(row.name)}`,
      }),
    );
  }

  private async searchTeams(q: string, limit: number, actor: SearchActor) {
    const textMatch: Prisma.TeamWhereInput = {
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { department: { name: { contains: q, mode: "insensitive" } } },
      ],
    };

    const where: Prisma.TeamWhereInput = {
      deletedAt: null,
      AND: [textMatch],
    };

    if (!isAdmin(actor) && !hasPermission(actor, PERMISSIONS.TEAM_MANAGE)) {
      where.AND = [
        textMatch,
        {
          OR: [
            { members: { some: { userId: actor.userId } } },
            { leaderId: actor.userId },
          ],
        },
      ];
    }

    const rows = await prisma.team.findMany({
      where,
      take: limit,
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
        department: { select: { name: true } },
        _count: { select: { members: true } },
      },
    });

    return rows.map((row) =>
      hit({
        id: row.id,
        type: "team",
        title: row.name,
        subtitle: [
          row.department?.name,
          `${row._count.members} members`,
          row.description,
        ]
          .filter(Boolean)
          .join(" · ")
          .slice(0, 120),
        href: `/team?q=${encodeURIComponent(row.name)}`,
      }),
    );
  }

  private async searchLeave(q: string, limit: number, actor: SearchActor) {
    const browse = canBrowsePeopleDirectory(actor);
    const where: Prisma.LeaveRequestWhereInput = browse
      ? {
          deletedAt: null,
          OR: [
            { reason: { contains: q, mode: "insensitive" } },
            { reviewNote: { contains: q, mode: "insensitive" } },
            {
              employee: {
                OR: [
                  { employeeCode: { contains: q, mode: "insensitive" } },
                  {
                    user: {
                      OR: [
                        { firstName: { contains: q, mode: "insensitive" } },
                        { lastName: { contains: q, mode: "insensitive" } },
                        { email: { contains: q, mode: "insensitive" } },
                      ],
                    },
                  },
                ],
              },
            },
          ],
        }
      : {
          deletedAt: null,
          employee: { userId: actor.userId },
          OR: [
            { reason: { contains: q, mode: "insensitive" } },
            { reviewNote: { contains: q, mode: "insensitive" } },
            {
              employee: {
                employeeCode: { contains: q, mode: "insensitive" },
              },
            },
          ],
        };

    const rows = await prisma.leaveRequest.findMany({
      where,
      take: limit,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        type: true,
        status: true,
        startDate: true,
        endDate: true,
        days: true,
        employee: {
          select: {
            id: true,
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    return rows.map((row) => {
      const name =
        `${row.employee.user.firstName} ${row.employee.user.lastName}`.trim();
      return hit({
        id: row.id,
        type: "leave",
        title: `${row.type} · ${name}`,
        subtitle: [
          row.status,
          `${row.days} day(s)`,
          `${row.startDate.toISOString().slice(0, 10)} → ${row.endDate.toISOString().slice(0, 10)}`,
        ].join(" · "),
        href: `/team?open=${encodeURIComponent(row.employee.id)}`,
      });
    });
  }

  private async searchReports(q: string, limit: number, actor: SearchActor) {
    const where: Prisma.SavedReportWhereInput = {
      deletedAt: null,
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ],
    };

    if (!isAdmin(actor) && !isSuperAdmin(actor)) {
      where.AND = [
        {
          OR: [
            { ownerId: actor.userId },
            { visibility: { in: ["TEAM", "COMPANY"] } },
          ],
        },
      ];
    }

    // Clients only see their own saved reports (never company-wide internals).
    if (isClient(actor)) {
      where.AND = [{ ownerId: actor.userId }];
    }

    const rows = await prisma.savedReport.findMany({
      where,
      take: limit,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
        visibility: true,
      },
    });

    return rows.map((row) =>
      hit({
        id: row.id,
        type: "report",
        title: row.name,
        subtitle: [row.category, row.visibility, row.description]
          .filter(Boolean)
          .join(" · ")
          .slice(0, 120),
        href: `/reports?open=${encodeURIComponent(row.id)}`,
      }),
    );
  }

  private async searchAiDocuments(
    q: string,
    limit: number,
    actor: SearchActor,
  ) {
    const where: Prisma.AiDocumentWhereInput = {
      deletedAt: null,
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { prompt: { contains: q, mode: "insensitive" } },
        { content: { contains: q, mode: "insensitive" } },
      ],
    };

    // AI docs are private per owner unless admin/super-admin.
    if (!isAdmin(actor)) {
      where.userId = actor.userId;
    }

    const rows = await prisma.aiDocument.findMany({
      where,
      take: limit,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        type: true,
        updatedAt: true,
      },
    });

    return rows.map((row) =>
      hit({
        id: row.id,
        type: "aiDocument",
        title: row.title,
        subtitle: [row.type, row.updatedAt.toISOString().slice(0, 10)].join(
          " · ",
        ),
        href: `/ai-documents?open=${encodeURIComponent(row.id)}`,
      }),
    );
  }

  private async searchAnnouncements(
    q: string,
    limit: number,
    actor: SearchActor,
  ) {
    const where: Prisma.AnnouncementWhereInput = {
      deletedAt: null,
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { body: { contains: q, mode: "insensitive" } },
      ],
    };

    // Non-admins only see published, non-expired announcements.
    if (!isAdmin(actor)) {
      where.AND = [
        { publishedAt: { not: null, lte: new Date() } },
        {
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
      ];
    }

    const rows = await prisma.announcement.findMany({
      where,
      take: limit,
      orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }],
      select: {
        id: true,
        title: true,
        priority: true,
        publishedAt: true,
        isPinned: true,
      },
    });

    return rows.map((row) =>
      hit({
        id: row.id,
        type: "announcement",
        title: row.title,
        subtitle: [
          row.priority,
          row.isPinned ? "Pinned" : null,
          row.publishedAt?.toISOString().slice(0, 10),
        ]
          .filter(Boolean)
          .join(" · "),
        href: `/announcements?open=${encodeURIComponent(row.id)}`,
      }),
    );
  }
}

export const searchService = new SearchService();
