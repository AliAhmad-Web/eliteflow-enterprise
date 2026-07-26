import type {
  ApiErrorResponse,
  ApiSuccessResponse,
  ValidationError,
} from "@enterprise/shared";
import { isApiErrorResponse } from "@enterprise/shared";

import { API_BASE_URL } from "../config";

export class ApiClientError extends Error {
  readonly code: string;
  readonly status: number;
  readonly errors: ValidationError[];

  constructor(
    message: string,
    code: string,
    status: number,
    errors: ValidationError[] = [],
  ) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
    this.status = status;
    this.errors = errors;
  }

  static fromResponse(status: number, body: ApiErrorResponse): ApiClientError {
    return new ApiClientError(body.message, body.code, status, body.errors);
  }
}

export function getApiBaseUrl(): string {
  return API_BASE_URL;
}

export async function parseApiResponse<T>(
  response: Response,
): Promise<ApiSuccessResponse<T>> {
  let body: ApiSuccessResponse<T> | ApiErrorResponse;

  try {
    body = (await response.json()) as ApiSuccessResponse<T> | ApiErrorResponse;
  } catch {
    throw new ApiClientError(
      "Invalid response from server",
      "INTERNAL_ERROR",
      response.status || 500,
    );
  }

  if (!response.ok || isApiErrorResponse(body)) {
    throw ApiClientError.fromResponse(
      response.status,
      isApiErrorResponse(body)
        ? body
        : {
            success: false,
            message: "Request failed",
            code: "INTERNAL_ERROR",
            errors: [],
          },
    );
  }

  return body;
}

export function toQueryString(
  params: Record<string, string | number | boolean | undefined | null>,
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}
