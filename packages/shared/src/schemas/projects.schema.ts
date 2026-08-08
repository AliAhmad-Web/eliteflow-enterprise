import { z } from "zod";

import { isAttachmentUrlSchemeAllowed } from "../utils/attachment-url.js";
import { uuidSchema } from "./common.schema.js";

export const PROJECT_STATUSES = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "ON_HOLD",
  "COMPLETED",
  "CANCELLED",
] as const;

export const PROJECT_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

export const MILESTONE_STATUSES = [
  "PENDING",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
] as const;

export const projectStatusSchema = z.enum(PROJECT_STATUSES);
export const projectPrioritySchema = z.enum(PROJECT_PRIORITIES);
export const milestoneStatusSchema = z.enum(MILESTONE_STATUSES);

export type ProjectStatusValue = z.infer<typeof projectStatusSchema>;
export type ProjectPriorityValue = z.infer<typeof projectPrioritySchema>;
export type MilestoneStatusValue = z.infer<typeof milestoneStatusSchema>;

const optionalText = (label: string, max: number) =>
  z
    .string()
    .trim()
    .max(max, `${label} must not exceed ${max} characters`);

const optionalDateString = z
  .string()
  .trim()
  .refine(
    (value) => value === "" || !Number.isNaN(Date.parse(value)),
    "Please enter a valid date",
  );

const milestoneInputSchema = z.object({
  title: z
    .string({ required_error: "Milestone title is required" })
    .trim()
    .min(1, "Milestone title is required")
    .max(200, "Milestone title must not exceed 200 characters"),
  description: optionalText("Description", 2000),
  dueDate: optionalDateString,
  status: milestoneStatusSchema,
  sortOrder: z.coerce.number().int().min(0),
});

const attachmentInputSchema = z.object({
  fileName: z
    .string({ required_error: "File name is required" })
    .trim()
    .min(1, "File name is required")
    .max(255, "File name must not exceed 255 characters"),
  fileUrl: z
    .string({ required_error: "File URL is required" })
    .trim()
    .max(2048, "File URL must not exceed 2048 characters")
    .refine(
      isAttachmentUrlSchemeAllowed,
      "Forbidden attachment URL scheme. Use a File Manager file.",
    ),
  mimeType: optionalText("MIME type", 120),
  sizeBytes: z.coerce.number().int().min(0).nullable().optional(),
  managedFileId: uuidSchema.optional().nullable(),
});

export const projectFieldsSchema = z.object({
  name: z
    .string({ required_error: "Project name is required" })
    .trim()
    .min(1, "Project name is required")
    .max(200, "Project name must not exceed 200 characters"),
  description: optionalText("Description", 5000),
  clientId: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || z.string().uuid().safeParse(value).success,
      "Invalid client",
    ),
  status: projectStatusSchema,
  priority: projectPrioritySchema,
  startDate: optionalDateString,
  dueDate: optionalDateString,
  progress: z.coerce.number().int().min(0).max(100),
  budget: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || (!Number.isNaN(Number(value)) && Number(value) >= 0),
      "Budget must be a positive number",
    ),
  memberIds: z.array(uuidSchema),
  milestones: z.array(milestoneInputSchema),
  attachments: z.array(attachmentInputSchema),
});

export const createProjectSchema = projectFieldsSchema;

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = projectFieldsSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

export const projectIdParamsSchema = z.object({
  id: uuidSchema,
});

export type ProjectIdParamsInput = z.infer<typeof projectIdParamsSchema>;

export const PROJECT_SORT_FIELDS = [
  "name",
  "status",
  "priority",
  "dueDate",
  "progress",
  "createdAt",
  "updatedAt",
] as const;

export const listProjectsQuerySchema = z.object({
  search: z.string().trim().max(200).optional().default(""),
  status: projectStatusSchema.optional(),
  priority: projectPrioritySchema.optional(),
  clientId: uuidSchema.optional(),
  sortBy: z.enum(PROJECT_SORT_FIELDS).optional().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
});

export type ListProjectsQueryInput = z.infer<typeof listProjectsQuerySchema>;

export const projectMemberSchema = z.object({
  id: uuidSchema,
  userId: uuidSchema,
  roleLabel: z.string().nullable(),
  assignedAt: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email(),
});

export const projectMilestoneSchema = z.object({
  id: uuidSchema,
  title: z.string(),
  description: z.string().nullable(),
  dueDate: z.string().nullable(),
  status: milestoneStatusSchema,
  sortOrder: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const projectAttachmentSchema = z.object({
  id: uuidSchema,
  fileName: z.string(),
  fileUrl: z.string(),
  mimeType: z.string().nullable(),
  sizeBytes: z.number().nullable(),
  uploadedById: uuidSchema.nullable(),
  createdAt: z.string(),
});

export const projectSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  description: z.string().nullable(),
  clientId: uuidSchema.nullable(),
  clientName: z.string().nullable(),
  status: projectStatusSchema,
  priority: projectPrioritySchema,
  startDate: z.string().nullable(),
  dueDate: z.string().nullable(),
  progress: z.number().int(),
  budget: z.number().nullable(),
  createdById: uuidSchema.nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  members: z.array(projectMemberSchema),
  milestones: z.array(projectMilestoneSchema),
  attachments: z.array(projectAttachmentSchema),
});

export type ProjectDto = z.infer<typeof projectSchema>;
export type ProjectMemberDto = z.infer<typeof projectMemberSchema>;
export type ProjectMilestoneDto = z.infer<typeof projectMilestoneSchema>;
export type ProjectAttachmentDto = z.infer<typeof projectAttachmentSchema>;
