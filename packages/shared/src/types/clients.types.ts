import type { ClientDto } from "../schemas/clients.schema.js";
import type { PaginatedResponse } from "./api.types.js";

export type Client = ClientDto;

export type ClientListResponse = PaginatedResponse<Client>;

export interface ClientMutationResponse {
  client: Client;
}

export interface ClientDeleteResponse {
  id: string;
  message: string;
}
