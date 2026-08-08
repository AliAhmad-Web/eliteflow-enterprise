import { z } from "zod";

import { isAttachmentUrlSchemeAllowed } from "../utils/attachment-url.js";
import { uuidSchema } from "./common.schema.js";

export const TASK_STATUSES = [
  "TODO",
  "IN_PROGRESS",
  "REVIEW",
  "COMPLETED",
  "BLOCKED",
] as const;

export const TASK_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

export const taskStatusSchema = z.enum(TASK_STATUSES);
export const taskPrioritySchema = z.enum(TASK_PRIORITIES);

export type TaskStatusValue = z.infer<typeof taskStatusSchema>;
export type TaskPriorityValue = z.infer<typeof taskPrioritySchema>;

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

const labelSchema = z
  .string()
  .trim()
  .min(1, "Label cannot be empty")
  .max(40, "Label must not exceed 40 characters");

export const taskFieldsSchema = z.object({
  title: z
    .string({ required_error: "Task title is required" })
    .trim()
    .min(1, "Task title is required")
    .max(200, "Task title must not exceed 200 characters"),
  description: optionalText("Description", 5000),
  projectId: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || z.string().uuid().safeParse(value).success,
      "Invalid project",
    ),
  assignedToId: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || z.string().uuid().safeParse(value).success,
      "Invalid assignee",
    ),
  status: taskStatusSchema,
  priority: taskPrioritySchema,
  labels: z.array(labelSchema).max(20, "A task can have at most 20 labels"),
  startDate: optionalDateString,
  dueDate: optionalDateString,
  progress: z.coerce.number().int().min(0).max(100),
  estimatedHours: z
    .string()
    .trim()
    .refine(
      (value) =>
        value === "" ||
        (!Number.isNaN(Number(value)) && Number(value) >= 0 && Number(value) <= 99999),
      "Estimated hours must be a positive number",
    ),
  attachments: z.array(attachmentInputSchema),
});

export const createTaskSchema = taskFieldsSchema;

export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = taskFieldsSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

/** Employee self-service updates: status + progress only */
export const employeeUpdateTaskSchema = z
  .object({
    status: taskStatusSchema.optional(),
    progress: z.coerce.number().int().min(0).max(100).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

export type EmployeeUpdateTaskInput = z.infer<typeof employeeUpdateTaskSchema>;

export const taskIdParamsSchema = z.object({
  id: uuidSchema,
});

export type TaskIdParamsInput = z.infer<typeof taskIdParamsSchema>;

export const createTaskCommentSchema = z.object({
  body: z
    .string({ required_error: "Comment is required" })
    .trim()
    .min(1, "Comment is required")
    .max(4000, "Comment must not exceed 4000 characters"),
});

export type CreateTaskCommentInput = z.infer<typeof createTaskCommentSchema>;

export const TASK_SORT_FIELDS = [
  "title",
  "status",
  "priority",
  "dueDate",
  "progress",
  "createdAt",
  "updatedAt",
] as const;

export const listTasksQuerySchema = z.object({
  search: z.string().trim().max(200).optional().default(""),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  projectId: uuidSchema.optional(),
  assignedToId: uuidSchema.optional(),
  sortBy: z.enum(TASK_SORT_FIELDS).optional().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
});

export type ListTasksQueryInput = z.infer<typeof listTasksQuerySchema>;

export const taskAssigneeSchema = z.object({
  id: uuidSchema,
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email(),
});

export const taskAttachmentSchema = z.object({
  id: uuidSchema,
  fileName: z.string(),
  fileUrl: z.string(),
  mimeType: z.string().nullable(),
  sizeBytes: z.number().nullable(),
  uploadedById: uuidSchema.nullable(),
  createdAt: z.string(),
});

export const taskCommentSchema = z.object({
  id: uuidSchema,
  body: z.string(),
  authorId: uuidSchema,
  authorFirstName: z.string(),
  authorLastName: z.string(),
  authorEmail: z.string().email(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const taskActivitySchema = z.object({
  id: uuidSchema,
  action: z.string(),
  message: z.string(),
  actorId: uuidSchema.nullable(),
  actorFirstName: z.string().nullable(),
  actorLastName: z.string().nullable(),
  metadata: z.record(z.unknown()).nullable(),
  createdAt: z.string(),
});

export const taskSchema = z.object({
  id: uuidSchema,
  title: z.string(),
  description: z.string().nullable(),
  projectId: uuidSchema.nullable(),
  projectName: z.string().nullable(),
  assignedToId: uuidSchema.nullable(),
  assignedTo: taskAssigneeSchema.nullable(),
  status: taskStatusSchema,
  priority: taskPrioritySchema,
  labels: z.array(z.string()),
  startDate: z.string().nullable(),
  dueDate: z.string().nullable(),
  progress: z.number().int(),
  estimatedHours: z.number().nullable(),
  createdById: uuidSchema.nullable(),
  updatedById: uuidSchema.nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  attachments: z.array(taskAttachmentSchema),
  comments: z.array(taskCommentSchema).optional(),
  commentCount: z.number().int().optional(),
});

export type TaskDto = z.infer<typeof taskSchema>;
export type TaskAttachmentDto = z.infer<typeof taskAttachmentSchema>;
export type TaskCommentDto = z.infer<typeof taskCommentSchema>;
export type TaskActivityDto = z.infer<typeof taskActivitySchema>;
