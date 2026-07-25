import { z } from "zod";

import { uuidSchema } from "./common.schema.js";

export const FILE_CATEGORIES = [
  "IMAGE",
  "PDF",
  "DOCUMENT",
  "SPREADSHEET",
  "PRESENTATION",
  "ARCHIVE",
  "TEXT",
  "VIDEO",
  "AUDIO",
  "OTHER",
] as const;

export const FILE_SHARE_ACCESS = ["VIEW", "DOWNLOAD"] as const;

export const FILE_SORT_FIELDS = [
  "name",
  "updatedAt",
  "createdAt",
  "sizeBytes",
  "category",
] as const;

export const fileCategorySchema = z.enum(FILE_CATEGORIES);
export const fileShareAccessSchema = z.enum(FILE_SHARE_ACCESS);

export type FileCategoryValue = z.infer<typeof fileCategorySchema>;
export type FileShareAccessValue = z.infer<typeof fileShareAccessSchema>;

export const createFolderSchema = z.object({
  name: z
    .string({ required_error: "Folder name is required" })
    .trim()
    .min(1, "Folder name is required")
    .max(200),
  parentId: uuidSchema.optional().nullable(),
  projectId: uuidSchema.optional().nullable(),
  clientId: uuidSchema.optional().nullable(),
});

export type CreateFolderInput = z.infer<typeof createFolderSchema>;

export const updateFolderSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    parentId: uuidSchema.optional().nullable(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

export type UpdateFolderInput = z.infer<typeof updateFolderSchema>;

export const folderIdParamsSchema = z.object({ id: uuidSchema });
export type FolderIdParamsInput = z.infer<typeof folderIdParamsSchema>;

export const listFoldersQuerySchema = z.object({
  parentId: z
    .union([uuidSchema, z.literal("root")])
    .optional()
    .default("root"),
  search: z.string().trim().max(200).optional().default(""),
});

export type ListFoldersQueryInput = z.infer<typeof listFoldersQuerySchema>;

export const listFilesQuerySchema = z.object({
  folderId: z.union([uuidSchema, z.literal("root")]).optional(),
  search: z.string().trim().max(200).optional().default(""),
  category: fileCategorySchema.optional(),
  tag: z.string().trim().max(50).optional(),
  favorite: z.enum(["true", "false"]).optional(),
  view: z
    .enum(["all", "recent", "favorites", "shared", "trash"])
    .optional()
    .default("all"),
  sortBy: z.enum(FILE_SORT_FIELDS).optional().default("updatedAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(24),
});

export type ListFilesQueryInput = z.infer<typeof listFilesQuerySchema>;

export const fileIdParamsSchema = z.object({ id: uuidSchema });
export type FileIdParamsInput = z.infer<typeof fileIdParamsSchema>;

export const updateFileSchema = z
  .object({
    name: z.string().trim().min(1).max(255).optional(),
    tags: z.array(z.string().trim().min(1).max(50)).max(20).optional(),
    isFavorite: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

export type UpdateFileInput = z.infer<typeof updateFileSchema>;

export const moveFileSchema = z.object({
  folderId: uuidSchema.nullable(),
});

export type MoveFileInput = z.infer<typeof moveFileSchema>;

export const shareFileSchema = z
  .object({
    sharedWithUserId: uuidSchema.optional(),
    sharedWithClientId: uuidSchema.optional(),
    access: fileShareAccessSchema.optional().default("DOWNLOAD"),
    expiresAt: z.string().datetime().optional().nullable(),
  })
  .refine(
    (data) => Boolean(data.sharedWithUserId || data.sharedWithClientId),
    { message: "sharedWithUserId or sharedWithClientId is required" },
  );

export type ShareFileInput = z.infer<typeof shareFileSchema>;

export const shareIdParamsSchema = z.object({ id: uuidSchema });
export type ShareIdParamsInput = z.infer<typeof shareIdParamsSchema>;

export const folderDtoSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  parentId: uuidSchema.nullable(),
  projectId: uuidSchema.nullable(),
  clientId: uuidSchema.nullable(),
  createdById: uuidSchema.nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  childCount: z.number().int().optional(),
  fileCount: z.number().int().optional(),
});

export type FolderDto = z.infer<typeof folderDtoSchema>;

export const managedFileDtoSchema = z.object({
  id: uuidSchema,
  folderId: uuidSchema.nullable(),
  name: z.string(),
  originalName: z.string(),
  mimeType: z.string(),
  extension: z.string(),
  sizeBytes: z.number(),
  category: fileCategorySchema,
  storageProvider: z.string(),
  tags: z.array(z.string()),
  isFavorite: z.boolean(),
  version: z.number().int(),
  projectId: uuidSchema.nullable(),
  clientId: uuidSchema.nullable(),
  createdById: uuidSchema.nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable().optional(),
  previewable: z.boolean(),
});

export type ManagedFileDto = z.infer<typeof managedFileDtoSchema>;

export const fileVersionDtoSchema = z.object({
  id: uuidSchema,
  fileId: uuidSchema,
  version: z.number().int(),
  sizeBytes: z.number(),
  mimeType: z.string(),
  note: z.string().nullable(),
  createdById: uuidSchema.nullable(),
  createdAt: z.string(),
});

export type FileVersionDto = z.infer<typeof fileVersionDtoSchema>;

export const fileShareDtoSchema = z.object({
  id: uuidSchema,
  fileId: uuidSchema,
  sharedWithUserId: uuidSchema.nullable(),
  sharedWithClientId: uuidSchema.nullable(),
  access: fileShareAccessSchema,
  createdById: uuidSchema.nullable(),
  expiresAt: z.string().nullable(),
  createdAt: z.string(),
});

export type FileShareDto = z.infer<typeof fileShareDtoSchema>;

export const fileActivityDtoSchema = z.object({
  id: uuidSchema,
  fileId: uuidSchema,
  actorId: uuidSchema.nullable(),
  action: z.string(),
  metadata: z.unknown().optional(),
  createdAt: z.string(),
});

export type FileActivityDto = z.infer<typeof fileActivityDtoSchema>;
