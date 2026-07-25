import argon2 from "argon2";
import pg from "pg";

const hash = await argon2.hash("Password123!", {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
});

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

await client.connect();

const result = await client.query(
  `UPDATE users
   SET password_hash = $1,
       failed_login_count = 0,
       locked_until = NULL
   WHERE email LIKE '%@eliteflow.dev'`,
  [hash],
);

console.log("updated users", result.rowCount);
await client.end();
