import { publicBankReturnAddress, BankReturnAddressError } from "@business-operations/pramaan";
import { createHash, randomUUID } from "node:crypto";
import { requirePramaan, type Pramaan } from "@business-operations/pramaan";
import { getObject, putObject, listObjectPaths } from "@business-operations/storage";

type Delta = Awaited<ReturnType<Pramaan["bankingTransactionsSync"]>>;
type Row = Delta["added"][number];
type Consent = { id: string; owner: string; ref?: string; cursor?: string; status: "starting" | "pending" | "unknown" | "revoked"; lastSyncAt?: number };
export const BANK_POLL_INTERVAL_MS = 4 * 60 * 60_000;
export const BANK_CONSENT_NOTICE = "Connecting gives access to the accounts, balances and transactions you authorise. A monthly rental for each account starts after you authorise the connection.";

function path(owner: string, id: string) {
  if (!/^[a-f0-9-]{36}$/.test(id)) throw new Error("Bank connection not found.");
  return `${createHash("sha256").update(owner).digest("hex")}/${id}.json`;
}
async function save(value: Consent) { await putObject({ bucket: "bank-consents", path: path(value.owner, value.id), data: JSON.stringify(value) }); }
async function load(owner: string, id: string, allowRevoked = false) {
  const file = await getObject({ bucket: "bank-consents", path: path(owner, id) });
  if (!file) throw new Error("Bank connection not found.");
  const value = JSON.parse(file.data.toString()) as Consent;
  if (value.owner !== owner || value.id !== id) throw new Error("Bank connection not found.");
  if (value.status === "revoked" && !allowRevoked) throw new Error("The bank connection was revoked.");
  if (!value.ref || value.status === "unknown") throw new Error("Could not confirm the bank connection. Check before connecting again.");
  return value;
}
export class BankFeeds {
  constructor(private readonly client?: Pramaan) {}
  private get p() { return this.client ?? requirePramaan(); }
  institutions(input: Parameters<Pramaan["bankingInstitutionsSearch"]>[0]) { return this.p.bankingInstitutionsSearch(input); }
  async connections(owner: string) {
    return (await this.records()).filter(row => row.owner === owner && row.status !== "revoked").map(row => ({ id: row.id, status: row.status }));
  }
  private async records(): Promise<Consent[]> {
    const records: Consent[] = [];
    for (const key of await listObjectPaths("bank-consents")) {
      const object = await getObject({ bucket: "bank-consents", path: key });
      if (object) records.push(JSON.parse(object.data.toString()) as Consent);
    }
    return records;
  }
  async revokeTeam(teamId: string) {
    for (const value of await this.records()) {
      if (value.owner.startsWith(`${teamId}:`) && value.status !== "revoked") await this.revoke(value.owner, value.id);
    }
  }
  async start(owner: string, input: { country: string; returnUrl: string; institutionRef?: string }, approved: boolean) {
    if (!approved) throw new Error("Read and approve the bank access and monthly rental before connecting.");
    if (!publicBankReturnAddress(input.returnUrl)) throw new BankReturnAddressError();
    const value: Consent = { id: randomUUID(), owner, status: "starting" };
    await save(value);
    try {
      const returnUrl = new URL(input.returnUrl);
      returnUrl.searchParams.set("bankConnection", value.id);
      const result = await this.p.bankingConnectionStart({ ...input, returnUrl: returnUrl.toString(), endUserRef: owner, consent: true,
        scopes: ["accounts", "balances", "transactions"] }, { idempotencyKey: value.id });
      if (!result.ref) throw new Error("The bank connection could not be confirmed.");
      value.ref = result.ref; value.status = "pending"; await save(value);
      return { id: value.id, connectUrl: result.connectUrl, expiresAt: result.expiresAt };
    } catch (error) { value.status = "unknown"; await save(value); throw error; }
  }
  async revoke(owner: string, id: string) {
    const value = await load(owner, id, true);
    if (value.status === "revoked") return { status: "revoked" };
    const result = await this.p.call("finance.consent.revoke", { ref: value.ref, confirm: true }, { idempotencyKey: `revoke:${id}` }) as { status: string };
    if (result.status !== "revoked") throw new Error("The bank revocation could not be confirmed. Check before trying again.");
    value.status = "revoked"; await save(value);
    return { status: "revoked" };
  }
  async status(owner: string, id: string) {
    const value = await load(owner, id);
    return this.p.bankingConnectionStatus({ ref: value.ref!, endUserRef: owner });
  }
  async accounts(owner: string, id: string) {
    const value = await load(owner, id);
    const rows: Awaited<ReturnType<Pramaan["bankingAccountsList"]>>["accounts"][number][] = [];
    let cursor: string | undefined;
    for (let page = 0; page < 100; page++) {
      const result = await this.p.bankingAccountsList({ ref: value.ref!, endUserRef: owner, cursor, limit: 100 });
      rows.push(...result.accounts);
      if (!result.truncated) return rows;
      if (!result.nextCursor || cursor === result.nextCursor) throw new Error("The account list is incomplete. Try checking its status later.");
      cursor = result.nextCursor;
    }
    throw new Error("The account list is incomplete. Try checking its status later.");
  }
  async balances(owner: string, id: string, accountRef: string) {
    const rows = await this.accounts(owner, id);
    if (!rows.some(row => row.rowRef === accountRef)) throw new Error("Bank account not found.");
    return this.p.bankingAccountBalancesGet({ ref: accountRef, endUserRef: owner });
  }
  async snapshot(owner: string, id: string, from: string, to: string) {
    await load(owner, id);
    const accounts = await this.accounts(owner, id);
    const snapshot = [];
    for (const account of accounts) {
      if (!account.rowRef || !account.name || !account.currency) throw new Error("The bank account details are incomplete.");
      const balance = await this.p.bankingAccountBalancesGet({ ref: account.rowRef, endUserRef: owner });
      const transactions: Row[] = [];
      let cursor: string | undefined;
      let complete = false;
      for (let page = 0; page < 100; page++) {
        const result = await this.p.bankingTransactionsList({ ref: account.rowRef, endUserRef: owner, from, to, cursor, limit: 100 });
        transactions.push(...result.transactions);
        if (!result.truncated) { complete = true; break; }
        if (!result.nextCursor || result.nextCursor === cursor) throw new Error("The transaction list is incomplete.");
        cursor = result.nextCursor;
      }
      if (!complete) throw new Error("The transaction list is incomplete.");
      snapshot.push({ account: { ...account, rowRef: account.rowRef, name: account.name, currency: account.currency }, balances: balance.balances, transactions });
    }
    return snapshot;
  }
  async sync(owner: string, id: string, onBatch?: (delta: Delta) => Promise<void>) {
    const value = await load(owner, id);
    if (value.lastSyncAt && Date.now() - value.lastSyncAt < BANK_POLL_INTERVAL_MS) return { skipped: true, nextSyncAt: value.lastSyncAt + BANK_POLL_INTERVAL_MS };
    const storagePath = path(owner, id);
    const existing = await getObject({ bucket: "bank-ledgers", path: storagePath });
    const ledger = existing ? JSON.parse(existing.data.toString()) as Record<string, Row> : {};
    let cursor = value.cursor;
    for (let page = 0; page < 100; page++) {
      const delta = await this.p.bankingTransactionsSync({ ref: value.ref!, endUserRef: owner, cursor, limit: 100 });
      for (const row of [...delta.added, ...delta.modified]) {
        if (!row.rowRef) throw new Error("The transaction reference could not be confirmed.");
        ledger[row.rowRef] = row;
      }
      for (const row of delta.removed) {
        if (!row.rowRef) throw new Error("The removed transaction reference could not be confirmed.");
        delete ledger[row.rowRef];
      }
      if (delta.hasMore && delta.nextCursor === cursor) throw new Error("The bank sync cursor did not advance.");
      if (onBatch) await onBatch(delta);
      await putObject({ bucket: "bank-ledgers", path: storagePath, data: JSON.stringify(ledger) });
      value.cursor = delta.nextCursor;
      await save(value);
      cursor = delta.nextCursor;
      if (!delta.hasMore) {
        value.lastSyncAt = Date.now(); await save(value);
        return { skipped: false, transactionCount: Object.keys(ledger).length, nextSyncAt: value.lastSyncAt + BANK_POLL_INTERVAL_MS };
      }
    }
    throw new Error("More bank transactions are waiting. Continue from the saved cursor later.");
  }
  async transactions(owner: string, id: string) {
    await load(owner, id);
    const file = await getObject({ bucket: "bank-ledgers", path: path(owner, id) });
    return file ? Object.values(JSON.parse(file.data.toString()) as Record<string, Row>) : [];
  }
}
