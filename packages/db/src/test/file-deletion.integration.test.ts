import { expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq, inArray } from "drizzle-orm";
import * as schema from "../schema";
import { withReplicas } from "../replicas";
import { deleteDocument, recordDocumentUpload } from "../queries/documents";
import { deleteInbox, deleteInboxMany } from "../queries/inbox";

test.skipIf(!process.env.BANK_IMPORT_TEST_DATABASE_URL)("deleting a file clears its inbox, vault and attachment references within the owning team", async () => {
  const pool = new Pool({ connectionString: process.env.BANK_IMPORT_TEST_DATABASE_URL });
  const primary = drizzle(pool, { schema, casing: "snake_case" });
  const db = withReplicas(primary, [primary], replicas => replicas[0]!);
  const teamId = randomUUID(), otherTeam = randomUUID();
  try {
    await db.insert(schema.teams).values([{ id: teamId, name: "File deletion fixture" }, { id: otherTeam, name: "Other file fixture" }]);
    for (const operation of ["vault", "inbox", "bulk"] as const) {
      const path = [teamId, `${operation}.png`];
      const doc = await recordDocumentUpload(db as any, { teamId, pathTokens: path, contentType: "image/png", size: 10, checksum: operation });
      const [receipt] = await db.insert(schema.inbox).values({ teamId, filePath: path }).returning();
      const [transaction] = await db.insert(schema.transactions).values({ teamId, name: "File fixture", date: "2026-10-17", amount: -10, currency: "GBP", method: "other", internalId: randomUUID(), taxRate: 20, taxType: "VAT" }).returning();
      await db.insert(schema.transactionAttachments).values([{ teamId, path, transactionId: transaction!.id }, { teamId: otherTeam, path }]);
      if (operation === "bulk") await db.insert(schema.transactionAttachments).values({ teamId, path: [teamId, "retained.png"], transactionId: transaction!.id });
      if (operation === "vault") await deleteDocument(db as any, { teamId, id: doc!.id });
      else if (operation === "inbox") await deleteInbox(db as any, { teamId, id: receipt!.id });
      else await deleteInboxMany(db as any, { teamId, ids: [receipt!.id] });
      expect((await db.select().from(schema.inbox).where(eq(schema.inbox.id, receipt!.id)))[0]?.status).toBe("deleted");
      expect(await db.select().from(schema.documents).where(eq(schema.documents.id, doc!.id))).toHaveLength(0);
      expect(await db.select().from(schema.transactionAttachments).where(eq(schema.transactionAttachments.teamId, teamId))).toHaveLength(operation === "bulk" ? 1 : 0);
      const [saved] = await db.select().from(schema.transactions).where(eq(schema.transactions.id, transaction!.id));
      expect(saved?.taxRate).toBe(operation === "bulk" ? 20 : null);
    }
    expect(await db.select().from(schema.transactionAttachments).where(eq(schema.transactionAttachments.teamId, otherTeam))).toHaveLength(3);
  } finally {
    await db.delete(schema.teams).where(inArray(schema.teams.id, [teamId, otherTeam]));
    await pool.end();
  }
});
