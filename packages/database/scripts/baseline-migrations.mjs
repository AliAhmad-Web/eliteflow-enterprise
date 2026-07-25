import pg from "pg";

const url = process.env.DATABASE_URL;
const client = new pg.Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 30000,
});

await client.connect();

await client.query(`
  CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
    id                  VARCHAR(36) PRIMARY KEY,
    checksum            VARCHAR(64) NOT NULL,
    finished_at         TIMESTAMPTZ,
    migration_name      VARCHAR(255) NOT NULL,
    logs                TEXT,
    rolled_back_at      TIMESTAMPTZ,
    started_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    applied_steps_count INTEGER NOT NULL DEFAULT 0
  );
`);

const migrations = [
  "20260722140000_init_authentication",
  "20260722150000_uuid_and_user_security_fields",
  "20260722160000_session_idle_cleanup_index",
  "20260722160000_user_two_factor_enabled",
];

for (const name of migrations) {
  await client.query(
    `DELETE FROM "_prisma_migrations" WHERE migration_name = $1`,
    [name],
  );
  await client.query(
    `INSERT INTO "_prisma_migrations"
      (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
     VALUES
      ($1, $2, now(), $3, NULL, NULL, now(), 1)`,
    [crypto.randomUUID(), "manual-baseline", name],
  );
  console.log("marked applied:", name);
}

await client.end();
console.log("done");
