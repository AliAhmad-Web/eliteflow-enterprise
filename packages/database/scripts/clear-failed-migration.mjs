import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL missing");
  process.exit(1);
}

const client = new pg.Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 30000,
});

await client.connect();
console.log("connected");

const result = await client.query(
  `DELETE FROM "_prisma_migrations" WHERE migration_name = $1`,
  ["20260722140000_init_authentication"],
);
console.log(`deleted rows: ${result.rowCount}`);

await client.end();
