import { expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq } from "drizzle-orm";
import * as schema from "../schema";
import { withReplicas } from "../replicas";
import { createTransactionCategory, updateTransactionCategory, deleteTransactionCategory } from "../queries/transaction-categories";

test.skipIf(!process.env.BANK_IMPORT_TEST_DATABASE_URL)("custom categories have independent stable identifiers through rename and deletion", async () => {
  const pool = new Pool({ connectionString: process.env.BANK_IMPORT_TEST_DATABASE_URL });
  const primary = drizzle(pool, { schema, casing: "snake_case" });
  const db = withReplicas(primary, [primary], replicas => replicas[0]!);
  const teamId = randomUUID();
  try {
    await db.insert(schema.teams).values({ id: teamId, name: "Category lifecycle fixture" });
    const first = await createTransactionCategory(db as any, { teamId, name: "Office supplies" });
    const second = await createTransactionCategory(db as any, { teamId, name: "Office supplies" });
    expect(first?.slug).toBeTruthy();
    expect(first?.slug).not.toBe(second?.slug);
    const updated = await updateTransactionCategory(db as any, { teamId, id: first!.id, name: "Renamed supplies" });
    expect(updated?.name).toBe("Renamed supplies");
    expect(updated?.slug).toBe(first!.slug);
    expect((await deleteTransactionCategory(db as any, { teamId, id: first!.id }))?.id).toBe(first!.id);
    expect((await db.select().from(schema.transactionCategories).where(eq(schema.transactionCategories.id, second!.id)))).toHaveLength(1);
  } finally {
    await db.delete(schema.teams).where(eq(schema.teams.id, teamId));
    await pool.end();
  }
});
