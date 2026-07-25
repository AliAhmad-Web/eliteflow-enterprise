import type { ApiErrorResponse, ApiSuccessResponse, ApiResponseMeta } from "@enterprise/shared";

export function successResponse<T>(
  data: T,
  message = "Success",
  meta?: ApiResponseMeta,
): ApiSuccessResponse<T> {
  return {
    success: true,
    message,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
  };
}

export function errorResponse(
  message: string,
  code: string,
  errors: ApiErrorResponse["errors"] = [],
): ApiErrorResponse {
  return {
    success: false,
    message,
    code,
    errors,
  };
}
