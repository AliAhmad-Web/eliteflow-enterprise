/** Public API v1 OpenAPI document (public surface only — no internal/admin routes). */
export const PUBLIC_API_OPENAPI_V1 = {
  openapi: "3.0.3",
  info: {
    title: "EliteFlow Public API",
    version: "v1",
    description:
      "Versioned external API for EliteFlow Enterprise. Machine authentication via API keys. Company scope is derived from the key — never from caller-supplied companyId.",
  },
  servers: [
    {
      url: "/api/v1/public",
      description: "Public API v1 base path",
    },
  ],
  tags: [
    { name: "Meta" },
    { name: "Clients" },
    { name: "Projects" },
    { name: "Tasks" },
    { name: "Invoices" },
    { name: "Keys" },
  ],
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: "apiKey",
        in: "header",
        name: "X-Api-Key",
        description:
          "Public API key (ef_live_...). Also accepted as Authorization: Bearer <key>.",
      },
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Session JWT for key management endpoints only.",
      },
    },
    schemas: {
      PublicError: {
        type: "object",
        required: ["error"],
        properties: {
          error: {
            type: "object",
            required: ["code", "message"],
            properties: {
              code: { type: "string", example: "PUBLIC_API_UNAUTHORIZED" },
              message: { type: "string" },
            },
          },
        },
      },
    },
    responses: {
      Unauthorized: {
        description: "Missing or invalid API key",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/PublicError" },
          },
        },
      },
      Forbidden: {
        description: "Missing scope or forbidden",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/PublicError" },
          },
        },
      },
      NotFound: {
        description: "Resource not found (also used for cross-company isolation)",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/PublicError" },
          },
        },
      },
    },
  },
  paths: {
    "/openapi.json": {
      get: {
        tags: ["Meta"],
        summary: "OpenAPI document",
        security: [],
        responses: {
          "200": {
            description: "OpenAPI 3 document wrapped in public success envelope",
          },
        },
      },
    },
    "/me": {
      get: {
        tags: ["Meta"],
        summary: "Current API credential context",
        security: [{ ApiKeyAuth: [] }],
        description: "Requires scope public:read.",
        responses: {
          "200": { description: "Credential context" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
    "/clients": {
      get: {
        tags: ["Clients"],
        summary: "List clients",
        security: [{ ApiKeyAuth: [] }],
        description:
          "Requires clients:read. Client-bound keys only see their own company.",
        responses: {
          "200": { description: "Client list" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
    "/clients/{id}": {
      get: {
        tags: ["Clients"],
        summary: "Get client by id",
        security: [{ ApiKeyAuth: [] }],
        responses: {
          "200": { description: "Client" },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/projects": {
      get: {
        tags: ["Projects"],
        summary: "List projects",
        security: [{ ApiKeyAuth: [] }],
        responses: { "200": { description: "Project list" } },
      },
    },
    "/projects/{id}": {
      get: {
        tags: ["Projects"],
        summary: "Get project by id",
        security: [{ ApiKeyAuth: [] }],
        responses: {
          "200": { description: "Project" },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/tasks": {
      get: {
        tags: ["Tasks"],
        summary: "List tasks",
        security: [{ ApiKeyAuth: [] }],
        responses: { "200": { description: "Task list" } },
      },
    },
    "/tasks/{id}": {
      get: {
        tags: ["Tasks"],
        summary: "Get task by id",
        security: [{ ApiKeyAuth: [] }],
        responses: {
          "200": { description: "Task" },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/invoices": {
      get: {
        tags: ["Invoices"],
        summary: "List invoices",
        security: [{ ApiKeyAuth: [] }],
        responses: { "200": { description: "Invoice list" } },
      },
    },
    "/invoices/{id}": {
      get: {
        tags: ["Invoices"],
        summary: "Get invoice by id",
        security: [{ ApiKeyAuth: [] }],
        responses: {
          "200": { description: "Invoice" },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/keys": {
      get: {
        tags: ["Keys"],
        summary: "List API keys",
        security: [{ BearerAuth: [] }],
        description:
          "Admin/session only. Requires integrations:manage. Never returns secrets.",
        responses: { "200": { description: "API key metadata list" } },
      },
      post: {
        tags: ["Keys"],
        summary: "Create API key",
        security: [{ BearerAuth: [] }],
        description:
          "Returns the raw secret once. Requires integrations:manage.",
        responses: {
          "201": { description: "Created key + one-time secret" },
        },
      },
    },
    "/keys/{id}/revoke": {
      post: {
        tags: ["Keys"],
        summary: "Revoke API key",
        security: [{ BearerAuth: [] }],
        responses: { "200": { description: "Revoked key metadata" } },
      },
    },
  },
} as const;
