import { createHash } from "node:crypto";
import type { BankFeeds } from "@business-operations/banking/feeds";
import { and, eq, inArray, sql } from "drizzle-orm";
import type { Database } from "../client";
import { bankAccounts, bankConnections, transactions } from "../schema";

type Snapshot = Awaited<ReturnType<BankFeeds["snapshot"]>>;
type ImportContext = { teamId: string; userId: string; connectionId: string };
export function feedRowId(teamId: string, connectionId: string, rowRef: string) {
  return createHash("sha256").update(JSON.stringify([teamId, connectionId, rowRef])).digest("hex");
}
export function bankAmount(amount: number, currency: string) {
  if (!Number.isSafeInteger(amount) || !/^[A-Z]{3}$/.test(currency)) throw new Error("The bank amount could not be confirmed.");
  const digits = new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions().maximumFractionDigits ?? 2;
  return amount / 10 ** digits;
}
export function mapBankTransaction(row: Snapshot[number]["transactions"][number], context: ImportContext, bankAccountId: string) {
  if (!row.rowRef || !row.date || !/^\d{4}-\d\d-\d\d$/.test(row.date) || !row.description?.trim())
    throw new Error("The bank transaction details are incomplete.");
  return { teamId: context.teamId, bankAccountId, internalId: feedRowId(context.teamId, context.connectionId, row.rowRef),
    amount: bankAmount(row.amount, row.currency), currency: row.currency, name: row.description,
    date: row.date, description: row.description, counterpartyName: row.counterparty?.name ?? null,
    status: row.status === "booked" ? "posted" as const : "pending" as const,
    method: "other" as const, manual: false };
}

/** Apply account snapshots and deltas together, preserving local categories and receipt links. */
export async function importBankFeed(db: Database, context: ImportContext, snapshot: Snapshot, removed: readonly { rowRef?: string }[]) {
  return db.transaction(async tx => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${context.teamId + context.connectionId}))`);
    const [connection] = await tx.insert(bankConnections).values({
      institutionId: context.connectionId, teamId: context.teamId, name: "Bank feed", provider: "pramaan",
      referenceId: context.connectionId, enrollmentId: context.userId, status: "connected", lastAccessed: new Date().toISOString(),
    }).onConflictDoUpdate({ target: [bankConnections.institutionId, bankConnections.teamId], set: { status: "connected", lastAccessed: new Date().toISOString() } }).returning();
    if (!connection) throw new Error("The bank connection could not be saved.");
    let count = 0;
    const transactionIds = new Set<string>();
    const enrichmentIds = new Set<string>();
    for (const item of snapshot) {
      const accountId = feedRowId(context.teamId, context.connectionId, item.account.rowRef);
      const current = item.balances.length === 1 ? item.balances[0] : item.balances.find(balance => balance.type === "current");
      const existing = await tx.query.bankAccounts.findFirst({ where: and(eq(bankAccounts.teamId, context.teamId), eq(bankAccounts.accountId, accountId)) });
      const data = { name: item.account.name, currency: item.account.currency,
        ...(current && current.currency === item.account.currency ? { balance: bankAmount(current.amount, current.currency) } : {}) };
      const [account] = existing
        ? await tx.update(bankAccounts).set(data).where(and(eq(bankAccounts.id, existing.id), eq(bankAccounts.teamId, context.teamId))).returning()
        : await tx.insert(bankAccounts).values({ ...data, balance: data.balance ?? null, accountId,
          accountReference: item.account.rowRef, bankConnectionId: connection.id, teamId: context.teamId, createdBy: context.userId, manual: false, enabled: true }).returning();
      if (!account) throw new Error("The bank account could not be saved.");
      for (const row of item.transactions) {
        const data = mapBankTransaction(row, context, account.id);
        const [saved] = await tx.insert(transactions).values(data).onConflictDoUpdate({ target: transactions.internalId,
          set: { amount: data.amount, currency: data.currency, name: data.name, date: data.date, description: data.description,
            counterpartyName: data.counterpartyName,
            status: sql`case when ${transactions.status} in ('pending', 'posted') then ${data.status}::"transactionStatus" else ${transactions.status} end` } }).returning({ id: transactions.id, enriched: transactions.enrichmentCompleted });
        if (!saved) throw new Error("The transaction could not be saved.");
        transactionIds.add(saved.id);
        if (!saved.enriched) enrichmentIds.add(saved.id);
        count++;
      }
    }
    const ids = removed.map(row => {
      if (!row.rowRef) throw new Error("The removed transaction reference is missing.");
      return feedRowId(context.teamId, context.connectionId, row.rowRef);
    });
    if (ids.length) await tx.update(transactions).set({ status: "excluded" }).where(and(eq(transactions.teamId, context.teamId), inArray(transactions.internalId, ids)));
    return { accounts: snapshot.length, transactions: count, transactionIds: [...transactionIds], enrichmentIds: [...enrichmentIds] };
  });
}
