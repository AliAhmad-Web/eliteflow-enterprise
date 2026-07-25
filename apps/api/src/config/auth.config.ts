export const authConfig = {
  jwtSecret: process.env.JWT_SECRET ?? "",
  jwtIssuer: process.env.JWT_ISSUER ?? "enterprise-bms-api",
  jwtAudience: process.env.JWT_AUDIENCE ?? "enterprise-bms-web",
  isProduction: process.env.NODE_ENV === "production",
  /** Comma-separated origins, e.g. `https://app.example.com,https://www.example.com` */
  corsOrigin:
    process.env.CORS_ORIGIN ??
    (process.env.NODE_ENV === "production" ? "" : "http://localhost:3000"),
  port: Number(process.env.PORT ?? 4000),
} as const;

export function getCorsOrigins(): string | string[] {
  const origins = authConfig.corsOrigin
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (origins.length === 0) {
    if (authConfig.isProduction) {
      throw new Error(
        "CORS_ORIGIN must be set in production to your deployed web origin(s).",
      );
    }
    return "http://localhost:3000";
  }

  return origins.length === 1 ? origins[0]! : origins;
}

export function assertAuthConfig(): void {
  if (!authConfig.jwtSecret || authConfig.jwtSecret.length < 32) {
    throw new Error("JWT_SECRET must be set and at least 32 characters");
  }

  if (authConfig.isProduction && !process.env.CORS_ORIGIN?.trim()) {
    throw new Error(
      "CORS_ORIGIN must be set in production (comma-separated HTTPS web origins).",
    );
  }

  const origins = getCorsOrigins();
  const originList = Array.isArray(origins) ? origins : [origins];

  if (
    authConfig.isProduction &&
    originList.some(
      (origin) =>
        origin.includes("localhost") ||
        origin.includes("127.0.0.1") ||
        origin.startsWith("http://"),
    )
  ) {
    throw new Error(
      "CORS_ORIGIN must use HTTPS production origins only (no localhost or http://).",
    );
  }
}
