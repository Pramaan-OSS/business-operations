import { Client } from "pg";

const url = process.env.TEST_DATABASE_URL;
if (!url || new URL(url).pathname !== "/business_operations_test" || process.env.PRAMAAN_FAKE !== "1") {
  throw new Error("CI setup requires the disposable business_operations_test database and fake mode.");
}

const client = new Client({ connectionString: process.env.TEST_DATABASE_URL });
await client.connect();
try {
  await client.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public");
  await client.query(await Bun.file("scripts/local/database.sql").text());
  const exported = await Bun.file(".scratch/ci/schema.sql").text();
  const sql = exported.slice(exported.indexOf("CREATE TYPE"));
  if (!sql.startsWith("CREATE TYPE")) throw new Error("Database schema export is missing.");
  await client.query(sql);
} finally {
  await client.end();
}
