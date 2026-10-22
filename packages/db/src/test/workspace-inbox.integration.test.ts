import { expect, test } from "bun:test";
import { Pool } from "pg";

test.skipIf(!process.env.BANK_IMPORT_TEST_DATABASE_URL)("new workspaces receive distinct usable inbox identifiers", async () => {
  const pool = new Pool({ connectionString: process.env.BANK_IMPORT_TEST_DATABASE_URL });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query("INSERT INTO public.teams (name) VALUES ($1), ($2) RETURNING inbox_id", ["Workspace fixture one", "Workspace fixture two"]);
    expect(rows).toHaveLength(2);
    expect(new Set(rows.map(row => row.inbox_id)).size).toBe(2);
    for (const row of rows) expect(row.inbox_id).toMatch(/^[a-f0-9]{32}$/);
  } finally {
    await client.query("ROLLBACK");
    client.release();
    await pool.end();
  }
});
