import type { QuoteDto } from "../schemas/quotes.schema.js";
import type { PaginatedResponse } from "./api.types.js";

export type Quote = QuoteDto;

export type QuoteListResponse = PaginatedResponse<Quote>;
