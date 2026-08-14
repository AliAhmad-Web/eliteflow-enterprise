import type { PaymentDto } from "../schemas/payments.schema.js";
import type { PaginatedResponse } from "./api.types.js";

export type Payment = PaymentDto;

export type PaymentListResponse = PaginatedResponse<Payment>;
