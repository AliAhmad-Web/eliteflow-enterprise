import { z } from "zod";

export const GLOBAL_SEARCH_SCOPES = [
  "all",
  "users",
  "employees",
  "clients",
  "projects",
  "tasks",
  "files",
  "messages",
  "notifications",
  "invoices",
  "calendar",
  "departments",
  "teams",
  "leave",
  "reports",
  "aiDocuments",
  "announcements",
] as const;

export const globalSearchScopeSchema = z.enum(GLOBAL_SEARCH_SCOPES);
export type GlobalSearchScope = z.infer<typeof globalSearchScopeSchema>;

export const globalSearchQuerySchema = z.object({
  q: z.string().trim().min(1, "Enter a search query").max(200),
  scope: globalSearchScopeSchema.default("all"),
  limit: z.coerce.number().int().min(1).max(20).default(8),
});

export type GlobalSearchQueryInput = z.infer<typeof globalSearchQuerySchema>;

export const globalSearchHitSchema = z.object({
  id: z.string(),
  type: z.enum([
    "user",
    "employee",
    "client",
    "project",
    "task",
    "file",
    "message",
    "notification",
    "invoice",
    "calendar",
    "department",
    "team",
    "leave",
    "report",
    "aiDocument",
    "announcement",
  ]),
  title: z.string(),
  subtitle: z.string().nullable(),
  href: z.string(),
  meta: z.record(z.string()).optional(),
});

export type GlobalSearchHit = z.infer<typeof globalSearchHitSchema>;

export const globalSearchResponseSchema = z.object({
  q: z.string(),
  total: z.number().int().nonnegative(),
  groups: z.object({
    users: z.array(globalSearchHitSchema),
    employees: z.array(globalSearchHitSchema),
    clients: z.array(globalSearchHitSchema),
    projects: z.array(globalSearchHitSchema),
    tasks: z.array(globalSearchHitSchema),
    files: z.array(globalSearchHitSchema),
    messages: z.array(globalSearchHitSchema),
    notifications: z.array(globalSearchHitSchema),
    invoices: z.array(globalSearchHitSchema),
    calendar: z.array(globalSearchHitSchema),
    departments: z.array(globalSearchHitSchema),
    teams: z.array(globalSearchHitSchema),
    leave: z.array(globalSearchHitSchema),
    reports: z.array(globalSearchHitSchema),
    aiDocuments: z.array(globalSearchHitSchema),
    announcements: z.array(globalSearchHitSchema),
  }),
});

export type GlobalSearchResponse = z.infer<typeof globalSearchResponseSchema>;
