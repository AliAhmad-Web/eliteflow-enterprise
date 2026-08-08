import { PrismaClient } from "./generated/client/index.js";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Ensure DATABASE_URL has hard abort params so hung remote Postgres
 * (Supabase pooler / network blackholes) cannot stall requests for minutes.
 * Does not override values already present in the URL.
 */
function withDatabaseTimeouts(rawUrl: string | undefined): string | undefined {
  if (!rawUrl) return rawUrl;
  try {
    const url = new URL(rawUrl);
    if (!url.searchParams.has("connect_timeout")) {
      url.searchParams.set(
        "connect_timeout",
        process.env.PRISMA_CONNECT_TIMEOUT_SECONDS ?? "5",
      );
    }
    if (!url.searchParams.has("pool_timeout")) {
      url.searchParams.set(
        "pool_timeout",
        process.env.PRISMA_POOL_TIMEOUT_SECONDS ?? "10",
      );
    }
    // libpq `options` sets server-side statement_timeout so hung queries abort.
    const statementMs = process.env.PRISMA_STATEMENT_TIMEOUT_MS ?? "15000";
    if (!url.searchParams.has("options")) {
      url.searchParams.set(
        "options",
        `-c statement_timeout=${statementMs}`,
      );
    }
    // Prefer a modest pool when using transaction poolers unless configured.
    // Keep enough headroom for concurrent auth + notifications (5 was too low
    // and caused "Unable to start a transaction in the given time").
    if (
      !url.searchParams.has("connection_limit") &&
      (url.searchParams.get("pgbouncer") === "true" ||
        url.port === "6543" ||
        url.hostname.includes("pooler."))
    ) {
      url.searchParams.set(
        "connection_limit",
        process.env.PRISMA_CONNECTION_LIMIT ?? "15",
      );
    }
    return url.toString();
  } catch {
    return rawUrl;
  }
}

const datasourceUrl = withDatabaseTimeouts(process.env.DATABASE_URL);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(datasourceUrl
      ? { datasources: { db: { url: datasourceUrl } } }
      : {}),
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export type { PrismaClient };
