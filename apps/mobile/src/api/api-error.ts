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

const PRODUCTION_API_URL = "https://api-production-a778.up.railway.app";

function isProductionBuild(): boolean {
  return (
    process.env.APP_ENV === "production" ||
    process.env.NODE_ENV === "production"
  );
}

function isDisallowedProductionApiUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return (
    lower.includes("localhost") ||
    lower.includes("127.0.0.1") ||
    lower.includes("10.0.2.2") ||
    lower.startsWith("http://")
  );
}

export function getApiBaseUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (configured) {
    const base = configured.replace(/\/$/, "");
    // Production EAS builds must never ship a local/insecure API origin.
    if (isProductionBuild() && isDisallowedProductionApiUrl(base)) {
      return PRODUCTION_API_URL;
    }
    return base;
  }
  // Release APKs must never throw during module init / first paint.
  if (isProductionBuild()) {
    return PRODUCTION_API_URL;
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
