/**
 * Standardized API response contracts shared between frontend and backend.
 */

// =============================================================================
// Validation Errors
// =============================================================================

/** Field-level validation error returned by API and consumed by forms. */
export interface ValidationError {
  /** Dot-notation field path (e.g. "email", "password", "address.line1") */
  field: string;
  /** Human-readable validation message */
  message: string;
  /** Optional machine-readable validation code */
  code?: string;
}

// =============================================================================
// Response Meta
// =============================================================================

export interface ApiResponseMeta {
  timestamp?: string;
  requestId?: string;
  [key: string]: unknown;
}

// =============================================================================
// Success Response
// =============================================================================

export interface ApiSuccessResponse<T> {
  success: true;
  message: string;
  data: T;
  meta?: ApiResponseMeta;
}

// =============================================================================
// Error Response
// =============================================================================

export interface ApiErrorResponse {
  success: false;
  message: string;
  errors: ValidationError[];
  code: string;
}

// =============================================================================
// Union & Helpers
// =============================================================================

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/** Type guard for successful API responses */
export function isApiSuccessResponse<T>(
  response: ApiResponse<T>,
): response is ApiSuccessResponse<T> {
  return response.success === true;
}

/** Type guard for failed API responses */
export function isApiErrorResponse(
  response: ApiResponse<unknown>,
): response is ApiErrorResponse {
  return response.success === false;
}

/** Paginated list metadata (reusable across modules) */
export interface PaginationMeta extends ApiResponseMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationMeta;
}
