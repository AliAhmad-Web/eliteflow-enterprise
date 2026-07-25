import type { InvoiceDto } from "../schemas/invoices.schema.js";
import type { PaginatedResponse } from "./api.types.js";

export type Invoice = InvoiceDto;

export type InvoiceListResponse = PaginatedResponse<Invoice>;

export interface InvoiceStats {
  total: number;
  draft: number;
  sent: number;
  pending: number;
  paid: number;
  overdue: number;
  cancelled: number;
  totalRevenue: number;
  outstandingAmount: number;
  paidAmount: number;
}
