import { recordDocumentUpload } from "../queries/documents";
import { draftInvoice } from "../queries/invoices";
import { getTrackerProjects, getTrackerProjectById } from "../queries/tracker-projects";
import { upsertApiKey } from "../queries/api-keys";
import { shouldSendNotification, upsertNotificationSetting } from "../queries/notification-settings";
import { globalSearchQuery, globalSemanticSearchQuery } from "../queries/search";
import { getBankAccountsBalances, getBankAccountsCurrencies } from "../queries/bank-accounts";
import { expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq } from "drizzle-orm";
import { BankFeeds } from "@business-operations/banking/feeds";
import { FakePramaan } from "@business-operations/pramaan/fake";
import { mkdir, mkdtemp } from "node:fs/promises";
import path from "node:path";
import * as schema from "../app-schema";
import { importBankFeed } from "../queries/bank-feed-import";
import { withReplicas } from "../replicas";

test.skipIf(!process.env.BANK_IMPORT_TEST_DATABASE_URL)("bank reads populate dashboard tables without duplicates or losing local work", async () => {
  const pool = new Pool({ connectionString: process.env.BANK_IMPORT_TEST_DATABASE_URL });
  const primary = drizzle(pool, { schema, casing: "snake_case" });
  const db = withReplicas(primary, [primary], replicas => replicas[0]!);
  const scratch = path.resolve(__dirname, "../../../../.scratch");
  await mkdir(scratch, { recursive: true });
  const previous = process.env.STORAGE_ROOT;
  process.env.STORAGE_ROOT = await mkdtemp(`${scratch}/bank-import-`);
  const teamId = randomUUID(), userId = randomUUID();
  const consent = `ref_${"0".repeat(26)}`, account = `ref_${"1".repeat(26)}`, rowRef = `ref_${"2".repeat(26)}`;
  let amount = -12345;
  const fake = new FakePramaan({
    "banking.connection.start": () => ({ ref: consent, connectUrl: "https://api.pramaan.dev/connect/link/test", expiresAt: "2099-01-01T00:00:00Z" }),
    "banking.accounts.list": () => ({ accounts: [{ rowRef: account, name: "Operating account", currency: "KWD" }], truncated: false }),
    "banking.account.balances.get": () => ({ balances: [{ type: "current", amount: 100001, currency: "KWD" }] }),
    "banking.transactions.list": () => ({ transactions: [{ rowRef, amount, currency: "KWD", direction: "debit", status: "booked", date: "2026-10-15", description: "Office equipment" }], truncated: false }),
  });
  const feeds = new BankFeeds(fake);
  try {
    await db.insert(schema.teams).values({ id: teamId, name: "Test business" });
    await db.insert(schema.users).values({ id: userId, teamId });
    const upload = { teamId, ownerId: userId, pathTokens: [teamId, "receipt.png"], contentType: "image/png", size: 10, checksum: "first" };
    const document = await recordDocumentUpload(db as any, upload);
    await db.update(schema.documents).set({ processingStatus: "completed", title: "Checked receipt" }).where(eq(schema.documents.id, document!.id));
    expect((await recordDocumentUpload(db as any, upload))?.processingStatus).toBe("completed");
    expect((await recordDocumentUpload(db as any, { ...upload, checksum: "changed" }))?.processingStatus).toBe("pending");
    expect((await db.select().from(schema.documents).where(eq(schema.documents.teamId, teamId)))).toHaveLength(1);
    await expect(recordDocumentUpload(db as any, { ...upload, pathTokens: [randomUUID(), "receipt.png"] })).rejects.toThrow("Use your own document folder.");
    const invoice = await draftInvoice(db as any, { id: randomUUID(), teamId, userId, invoiceNumber: "LOCAL-CHECK", template: {}, issueDate: "2026-10-15", dueDate: "2026-11-15" });
    expect((invoice?.template as any)?.size).toBe("a4");
    expect(invoice?.currency).toBe("USD");
    const projectId = randomUUID();
    await db.insert(schema.trackerProjects).values({ id: projectId, name: "Owned project", teamId, rate: 100, currency: "GBP" });
    await db.insert(schema.trackerEntries).values([{ projectId, teamId, duration: 3600, rate: 120 }, { projectId, teamId, duration: 1800 }]);
    const project = await getTrackerProjectById(db as any, { teamId, id: projectId });
    expect(project?.totalDuration).toBe(5400);
    expect(project?.totalAmount).toBe(170);
    expect((await getTrackerProjects(db as any, { teamId })).data[0]?.id).toBe(projectId);
    const keyId = randomUUID();
    await db.insert(schema.apiKeys).values({ id: keyId, name: "Owned key", teamId, userId, keyEncrypted: "test-only", keyHash: randomUUID(), scopes: ["transactions.read"] });
    await upsertApiKey(db as any, { id: keyId, name: "Foreign edit", teamId: randomUUID(), userId, scopes: ["transactions.write"] });
    expect((await db.select().from(schema.apiKeys).where(eq(schema.apiKeys.id, keyId)))[0]?.name).toBe("Owned key");
    expect(await shouldSendNotification(db as any, userId, teamId, "transactions_created", "email")).toBe(false);
    expect(await shouldSendNotification(db as any, userId, teamId, "transactions_created", "in_app")).toBe(true);
    await upsertNotificationSetting(db as any, { userId, teamId, notificationType: "transactions_created", channel: "email", enabled: true });
    expect(await shouldSendNotification(db as any, userId, teamId, "transactions_created", "email")).toBe(true);
    const connection = await feeds.start(`${teamId}:${userId}`, { country: "GB", returnUrl: "https://example.test/banking" }, true);
    const context = { teamId, userId, connectionId: connection.id };
    const snapshot = await feeds.snapshot(`${teamId}:${userId}`, connection.id, "2026-10-01", "2026-10-31");
    await importBankFeed(db, context, snapshot, []);
    const [saved] = await db.select().from(schema.transactions).where(eq(schema.transactions.teamId, teamId));
    expect(saved?.amount).toBe(-12.345);
    expect((await db.select().from(schema.bankAccounts).where(eq(schema.bankAccounts.teamId, teamId)))[0]?.balance).toBe(100.001);
    expect((await getBankAccountsBalances(db as any, teamId))[0]?.balance).toBe(100.001);
    expect(await getBankAccountsCurrencies(db as any, teamId)).toEqual([{ currency: "KWD" }]);
    expect((await globalSearchQuery(db as any, { teamId, searchTerm: "Office equipment" }))[0]?.id).toBe(saved!.id);
    expect(await globalSearchQuery(db as any, { teamId: randomUUID(), searchTerm: "Office equipment" })).toEqual([]);
    expect((await globalSemanticSearchQuery(db as any, { teamId, searchTerm: "", types: ["transactions"], currency: "KWD", amountMin: 12, amountMax: 13, itemsPerTableLimit: 5 }))[0]?.id).toBe(saved!.id);
    expect(await globalSemanticSearchQuery(db as any, { teamId, searchTerm: "", types: ["transactions"], amountMin: 100, itemsPerTableLimit: 5 })).toEqual([]);
    await db.update(schema.transactions).set({ note: "Checked by owner", status: "completed" }).where(eq(schema.transactions.id, saved!.id));
    amount = -12555;
    await importBankFeed(db, context, await feeds.snapshot(`${teamId}:${userId}`, connection.id, "2026-10-01", "2026-10-31"), []);
    const updated = await db.select().from(schema.transactions).where(eq(schema.transactions.teamId, teamId));
    expect(updated).toHaveLength(1);
    expect(updated[0]).toMatchObject({ id: saved!.id, amount: -12.555, note: "Checked by owner", status: "completed" });
    expect(await db.select().from(schema.bankAccounts).where(eq(schema.bankAccounts.teamId, teamId))).toHaveLength(1);
    await importBankFeed(db, context, [], [{ rowRef }]);
    expect((await db.select().from(schema.transactions).where(eq(schema.transactions.id, saved!.id)))[0]?.status).toBe("excluded");
  } finally {
    await db.delete(schema.teams).where(eq(schema.teams.id, teamId));
    await db.delete(schema.users).where(eq(schema.users.id, userId));
    await pool.end();
    if (previous === undefined) delete process.env.STORAGE_ROOT; else process.env.STORAGE_ROOT = previous;
  }
});
