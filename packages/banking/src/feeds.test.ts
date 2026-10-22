import { expect, test } from "bun:test";
import { FakePramaan } from "@business-operations/pramaan/fake";
import { mkdir, mkdtemp } from "node:fs/promises";
import path from "node:path";
import { BankFeeds, BANK_POLL_INTERVAL_MS, BANK_CONSENT_NOTICE } from "./feeds";

test("owned bank consents, pagination and cursor reads never invent account or transaction data", async () => {
  const scratch = path.resolve(__dirname, "../../../.scratch");
  await mkdir(scratch, { recursive: true });
  const previous = process.env.STORAGE_ROOT;
  process.env.STORAGE_ROOT = await mkdtemp(`${scratch}/banks-`);
  const ref = `ref_${"0".repeat(26)}`;
  const account = `ref_${"1".repeat(26)}`;
  const rowRef = `ref_${"2".repeat(26)}`;
  let pages = 0;
  const fake = new FakePramaan({
    "banking.connection.start": () => ({ ref, connectUrl: "https://api.pramaan.dev/connect/link/test", expiresAt: "2099-01-01T00:00:00Z" }),
    "banking.connection.status": () => ({ status: "connected" }),
    "finance.consent.revoke": () => ({ status: "revoked" }),
    "banking.accounts.list": () => ({ accounts: [{ rowRef: account, name: "Business account", currency: "GBP" }], truncated: false }),
    "banking.account.balances.get": () => ({ balances: [{ type: "current", amount: 12500, currency: "GBP" }] }),
    "banking.transactions.sync": () => {
      pages++;
      return { added: pages === 1 ? [{ rowRef, amount: -1250, currency: "GBP", direction: "debit", status: "booked", date: "2026-10-15" }] : [], modified: [], removed: [], nextCursor: `cursor${pages}`, hasMore: pages === 1 };
    },
  });
  const feeds = new BankFeeds(fake);
  try {
    await expect(feeds.start("person1", { country: "GB", returnUrl: "https://example.test/banks" }, false)).rejects.toThrow("monthly rental");
    const connection = await feeds.start("person1", { country: "GB", returnUrl: "https://example.test/banks" }, true);
    await expect(feeds.status("person2", connection.id)).rejects.toThrow("not found");
    expect(await feeds.connections("person1")).toEqual([{ id: connection.id, status: "pending" }]);
    expect(await feeds.connections("person2")).toEqual([]);
    expect(await feeds.accounts("person1", connection.id)).toHaveLength(1);
    await expect(feeds.balances("person1", connection.id, "wrong")).rejects.toThrow("not found");
    expect((await feeds.balances("person1", connection.id, account)).balances[0]?.amount).toBe(12500);
    expect((await feeds.sync("person1", connection.id)).skipped).toBe(false);
    expect(fake.callsTo("banking.transactions.sync")).toEqual([
      { ref, endUserRef: "person1", cursor: undefined, limit: 100 },
      { ref, endUserRef: "person1", cursor: "cursor1", limit: 100 },
    ]);
    expect((await feeds.transactions("person1", connection.id))[0]).toMatchObject({ amount: -1250, currency: "GBP" });
    expect((await feeds.sync("person1", connection.id)).skipped).toBe(true);
    expect(pages).toBe(2);
    await expect(feeds.revoke("person2", connection.id)).rejects.toThrow("not found");
    expect(fake.callsTo("finance.consent.revoke")).toHaveLength(0);
    expect(await feeds.revoke("person1", connection.id)).toEqual({ status: "revoked" });
    expect(await feeds.connections("person1")).toEqual([]);
    expect(await feeds.revoke("person1", connection.id)).toEqual({ status: "revoked" });
    expect(fake.callsTo("finance.consent.revoke")).toEqual([{ ref, confirm: true }]);
    await expect(feeds.sync("person1", connection.id)).rejects.toThrow();
    expect(BANK_POLL_INTERVAL_MS).toBe(4 * 60 * 60_000);
    expect(BANK_CONSENT_NOTICE).toContain("after you authorise");
  } finally { if (previous === undefined) delete process.env.STORAGE_ROOT; else process.env.STORAGE_ROOT = previous; }
});

test("a local bank return address is refused before creating consent or calling the service", async () => {
 const fake = new FakePramaan({});
 await expect(new BankFeeds(fake).start("person1", { country: "GB", returnUrl: "http://localhost:3011/banking" }, true)).rejects.toThrow("public HTTPS address");
 expect(fake.calls).toHaveLength(0);
 await expect(fake.bankingConnectionStart({ endUserRef: "person1", country: "GB", returnUrl: "http://localhost:3011/banking" }, { idempotencyKey: "local-refusal" })).rejects.toThrow("public HTTPS address");
 expect(fake.calls).toHaveLength(0);
});
