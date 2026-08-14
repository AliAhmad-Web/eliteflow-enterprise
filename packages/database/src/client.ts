import { PrismaClient } from "./generated/client/index.js";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function isPoolerHost(hostname: string, port: string, params: URLSearchParams): boolean {
  return (
    params.get("pgbouncer") === "true" ||
    port === "6543" ||
    hostname.includes("pooler.")
  );
}

/**
 * Ensure DATABASE_URL has hard abort params so hung remote Postgres
 * (Supabase pooler / network blackholes) cannot stall requests for minutes.
 *
 * For pooler hosts, also *raise* a too-low connection_limit baked into env
 * URLs (production previously used 5, which starved OAuth under audit load).
 */
function withDatabaseTimeouts(rawUrl: string | undefined): string | undefined {
  if (!rawUrl) return rawUrl;
  try {
    const url = new URL(rawUrl);
    const pooler = isPoolerHost(
      url.hostname,
      url.port || "",
      url.searchParams,
    );

    if (!url.searchParams.has("connect_timeout")) {
      url.searchParams.set(
        "connect_timeout",
        process.env.PRISMA_CONNECT_TIMEOUT_SECONDS ?? "5",
      );
    }

    const desiredPoolTimeout = Number(
      process.env.PRISMA_POOL_TIMEOUT_SECONDS ??
        (process.env.VERCEL ? "8" : "10"),
    );
    const existingPoolTimeout = Number(
      url.searchParams.get("pool_timeout") ?? "NaN",
    );
    if (
      !url.searchParams.has("pool_timeout") ||
      (Number.isFinite(existingPoolTimeout) &&
        existingPoolTimeout > desiredPoolTimeout)
    ) {
      url.searchParams.set("pool_timeout", String(desiredPoolTimeout));
    }

    // libpq `options` sets server-side statement_timeout so hung queries abort.
    const statementMs = process.env.PRISMA_STATEMENT_TIMEOUT_MS ?? "15000";
    if (!url.searchParams.has("options")) {
      url.searchParams.set("options", `-c statement_timeout=${statementMs}`);
    }

    if (pooler) {
      const configured = process.env.PRISMA_CONNECTION_LIMIT?.trim();
      // Keep small on serverless so many isolates do not exhaust Supavisor.
      // Auth still needs >1 for a main query + one fire-and-forget side write.
      const desiredLimit = Number(
        configured ?? (process.env.VERCEL ? "2" : "5"),
      );
      const existingLimit = Number(
        url.searchParams.get("connection_limit") ?? "NaN",
      );
      // Explicit PRISMA_CONNECTION_LIMIT always wins. Otherwise raise a too-low
      // baked-in limit, but never exceed the configured default (Supabase
      // session pool is often ~15 total across all clients).
      if (configured) {
        url.searchParams.set("connection_limit", String(desiredLimit));
      } else if (
        !url.searchParams.has("connection_limit") ||
        !Number.isFinite(existingLimit) ||
        existingLimit < 1 ||
        existingLimit > desiredLimit
      ) {
        url.searchParams.set("connection_limit", String(desiredLimit));
      }
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

// Reuse one PrismaClient per isolate (required for Vercel/serverless).
// Without this, warm recycles still share the module singleton via `export const`,
// but HMR/dev and some runtimes re-evaluate modules — globalThis is the safe cache.
if (process.env.NODE_ENV !== "production" || process.env.VERCEL) {
  globalForPrisma.prisma = prisma;
}

export type { PrismaClient };
