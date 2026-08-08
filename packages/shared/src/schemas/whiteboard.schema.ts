import { z } from "zod";

import { uuidSchema } from "./common.schema.js";

export const WHITEBOARD_EXPORT_FORMATS = ["PNG", "JPG", "PDF", "SVG"] as const;
export const WHITEBOARD_AI_ACTIONS = [
  "SUMMARIZE",
  "OCR",
  "CONVERT_DIAGRAM",
  "GENERATE_TASKS",
  "MEETING_NOTES",
  "SUGGESTIONS",
] as const;

export const whiteboardExportFormatSchema = z.enum(WHITEBOARD_EXPORT_FORMATS);
export const whiteboardAiActionSchema = z.enum(WHITEBOARD_AI_ACTIONS);

export type WhiteboardExportFormatValue = z.infer<
  typeof whiteboardExportFormatSchema
>;
export type WhiteboardAiActionValue = z.infer<typeof whiteboardAiActionSchema>;

/** Canvas document schema (scene graph). Kept permissive for forward compatibility. */
export const whiteboardCanvasDataSchema = z
  .object({
    schemaVersion: z.number().int().min(1).default(1),
    viewport: z
      .object({
        x: z.number().default(0),
        y: z.number().default(0),
        zoom: z.number().positive().default(1),
      })
      .default({ x: 0, y: 0, zoom: 1 }),
    objects: z.array(z.unknown()).default([]),
  })
  .passthrough();

export type WhiteboardCanvasDataInput = z.infer<
  typeof whiteboardCanvasDataSchema
>;

export const createWhiteboardSchema = z.object({
  title: z.string().trim().min(1).max(200).optional().default("Untitled Whiteboard"),
  canvasData: whiteboardCanvasDataSchema.optional(),
  thumbnail: z.string().max(2_000_000).optional().nullable(),
  projectId: uuidSchema.optional().nullable(),
  taskId: uuidSchema.optional().nullable(),
  clientId: uuidSchema.optional().nullable(),
  teamId: uuidSchema.optional().nullable(),
  organizationId: uuidSchema.optional().nullable(),
  workspaceId: uuidSchema.optional().nullable(),
});

export type CreateWhiteboardInput = z.infer<typeof createWhiteboardSchema>;

export const updateWhiteboardSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    canvasData: whiteboardCanvasDataSchema.optional(),
    thumbnail: z.string().max(2_000_000).optional().nullable(),
    projectId: uuidSchema.optional().nullable(),
    taskId: uuidSchema.optional().nullable(),
    clientId: uuidSchema.optional().nullable(),
    teamId: uuidSchema.optional().nullable(),
    createVersion: z.boolean().optional(),
    versionLabel: z.string().trim().max(200).optional().nullable(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: "At least one field is required",
  });

export type UpdateWhiteboardInput = z.infer<typeof updateWhiteboardSchema>;

export const renameWhiteboardSchema = z.object({
  title: z.string().trim().min(1).max(200),
});

export type RenameWhiteboardInput = z.infer<typeof renameWhiteboardSchema>;

export const duplicateWhiteboardSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
});

export type DuplicateWhiteboardInput = z.infer<
  typeof duplicateWhiteboardSchema
>;

export const listWhiteboardsQuerySchema = z.object({
  search: z.string().trim().max(200).optional().default(""),
  projectId: uuidSchema.optional(),
  taskId: uuidSchema.optional(),
  clientId: uuidSchema.optional(),
  teamId: uuidSchema.optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export type ListWhiteboardsQueryInput = z.infer<
  typeof listWhiteboardsQuerySchema
>;

export const whiteboardIdParamsSchema = z.object({
  id: uuidSchema,
});

export type WhiteboardIdParamsInput = z.infer<typeof whiteboardIdParamsSchema>;

export const whiteboardAiRequestSchema = z.object({
  action: whiteboardAiActionSchema,
  canvasData: whiteboardCanvasDataSchema.optional(),
  prompt: z.string().trim().max(4000).optional(),
});

export type WhiteboardAiRequestInput = z.infer<typeof whiteboardAiRequestSchema>;

export const createWhiteboardCommentSchema = z.object({
  body: z.string().trim().min(1).max(4000),
  anchorX: z.number().optional().default(0),
  anchorY: z.number().optional().default(0),
  objectId: z.string().max(64).optional().nullable(),
});

export type CreateWhiteboardCommentInput = z.input<
  typeof createWhiteboardCommentSchema
>;

/** Matches whiteboardsService.listComments / addComment response shapes. */
export const whiteboardCommentDtoSchema = z.object({
  id: uuidSchema,
  whiteboardId: uuidSchema,
  authorId: uuidSchema,
  body: z.string(),
  anchorX: z.number(),
  anchorY: z.number(),
  objectId: z.string().nullable(),
  resolvedAt: z.string().nullable().optional(),
  createdAt: z.string(),
});

export type WhiteboardCommentDto = z.infer<typeof whiteboardCommentDtoSchema>;

export const whiteboardDtoSchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema.nullable(),
  workspaceId: uuidSchema.nullable(),
  projectId: uuidSchema.nullable(),
  taskId: uuidSchema.nullable(),
  clientId: uuidSchema.nullable(),
  teamId: uuidSchema.nullable(),
  title: z.string(),
  canvasData: z.unknown(),
  thumbnail: z.string().nullable(),
  ownerId: uuidSchema,
  version: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type WhiteboardDto = z.infer<typeof whiteboardDtoSchema>;

export const whiteboardListItemSchema = whiteboardDtoSchema.omit({
  canvasData: true,
});

export type WhiteboardListItem = z.infer<typeof whiteboardListItemSchema>;

export const whiteboardListResponseSchema = z.object({
  items: z.array(whiteboardListItemSchema),
  page: z.number().int(),
  limit: z.number().int(),
  total: z.number().int(),
  totalPages: z.number().int(),
});

export type WhiteboardListResponse = z.infer<
  typeof whiteboardListResponseSchema
>;

export const whiteboardVersionDtoSchema = z.object({
  id: uuidSchema,
  whiteboardId: uuidSchema,
  version: z.number().int(),
  title: z.string(),
  thumbnail: z.string().nullable(),
  label: z.string().nullable(),
  createdById: uuidSchema.nullable(),
  createdAt: z.string(),
});

export type WhiteboardVersionDto = z.infer<typeof whiteboardVersionDtoSchema>;
