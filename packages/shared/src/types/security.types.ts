import type {
  ActiveDeviceDto,
  LoginHistoryDto,
  PasswordHistoryItemDto,
  PasswordStatusDto,
  SecurityAuditLogDto,
  SecurityDashboardDto,
  SecurityEventDto,
  SecurityScoreDto,
} from "../schemas/security.schema.js";

export type {
  ActiveDeviceDto,
  LoginHistoryDto,
  PasswordHistoryItemDto,
  PasswordStatusDto,
  SecurityAuditLogDto,
  SecurityDashboardDto,
  SecurityEventDto,
  SecurityScoreDto,
};

/** Security list pagination (pageSize aligns with notifications / communication). */
export interface SecurityPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
}

export interface SecurityAuditLogListResponse {
  items: SecurityAuditLogDto[];
  pagination: SecurityPagination;
}

export interface LoginHistoryListResponse {
  items: LoginHistoryDto[];
  pagination: SecurityPagination;
}

export interface ActiveDeviceListResponse {
  items: ActiveDeviceDto[];
  pagination: SecurityPagination;
}

export interface PasswordHistoryListResponse {
  items: PasswordHistoryItemDto[];
  pagination: SecurityPagination;
}

export interface SecurityEventListResponse {
  items: SecurityEventDto[];
  pagination: SecurityPagination;
}

export interface ChangePasswordSecurityResponse {
  message: string;
  passwordChangedAt: string;
}

export interface UnlockAccountResponse {
  message: string;
  userId: string;
  unlockedAt: string;
}

export interface ContactFormResponse {
  message: string;
  ticketId: string;
}

export interface CsrfTokenResponse {
  csrfToken: string;
}
