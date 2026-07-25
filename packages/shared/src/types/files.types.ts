import type {
  FolderDto,
  ManagedFileDto,
} from "../schemas/files.schema.js";
import type { PaginatedResponse } from "./api.types.js";

export type Folder = FolderDto;
export type ManagedFile = ManagedFileDto;

export type FolderListResponse = {
  items: Folder[];
};

export type ManagedFileListResponse = PaginatedResponse<ManagedFile>;
