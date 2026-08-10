import { AppError } from "../../shared/errors/app-error.js";
import { PUBLIC_API_ERROR_CODES } from "@enterprise/shared";

export class PublicApiError extends AppError {
  constructor(
    message: string,
    statusCode: number,
    code: string = PUBLIC_API_ERROR_CODES.INTERNAL_ERROR,
  ) {
    super(message, statusCode, code);
    this.name = "PublicApiError";
  }
}

export { PUBLIC_API_ERROR_CODES };
