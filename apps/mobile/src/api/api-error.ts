import type {
  ApiErrorResponse,
  ApiSuccessResponse,
  ValidationError,
} from "@enterprise/shared";
import { isApiErrorResponse } from "@enterprise/shared";

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
  const configured = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (configured) {
    return configured;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "EXPO_PUBLIC_API_URL must be set to your production API origin (HTTPS).",
    );
  }
  return "http://localhost:4000";
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
