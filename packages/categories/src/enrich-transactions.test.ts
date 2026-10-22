import { expect, test } from "bun:test";
import { FakePramaan } from "@business-operations/pramaan/fake";
import { enrichTransactions, EXPENSE_CATEGORIES } from "./enrich-transactions";

function fixture(items: unknown[]) {
  const fake = new FakePramaan();
  fake.routeOutcomes({
    estimate: () => ({ ready: true, canRun: true, plan: "plan", steps: [] }),
    run: () => ({ status: "done", steps: [], result: { items } }),
  });
  return fake;
}
const transaction = { id: "tx1", name: "EXAMPLE STORE", amount: -20, merchantName: null, categorySlug: null };
const options = { idempotencyKey: "enrich:test:1" };

test("uses the outcome contract and keeps income and existing categories unchanged", async () => {
  const fake = fixture([
    { descriptor: transaction.name, category: "software", merchantName: "Example" },
    { descriptor: transaction.name, category: "travel" },
    { descriptor: transaction.name, category: "meals" },
  ]);
  expect(await enrichTransactions(fake, [transaction, { ...transaction, id: "tx2", amount: 100 }, { ...transaction, id: "tx3", categorySlug: "rent" }], options)).toEqual([
    { transactionId: "tx1", data: { merchantName: "Example", categorySlug: "software" } },
    { transactionId: "tx2", data: {} },
    { transactionId: "tx3", data: {} },
  ]);
  expect(fake.outcomeCalls[1]).toMatchObject({ verb: "start", id: "expenses.categorize", input: { descriptors: [transaction.name, transaction.name, transaction.name] }, opts: { options: { categories: [...EXPENSE_CATEGORIES] }, idempotencyKey: options.idempotencyKey, retry: false } });
  expect(EXPENSE_CATEGORIES.length).toBeLessThanOrEqual(32);
});

test("rejects mismatched or missing rows instead of applying another transaction's category", async () => {
  for (const items of [[], [{ descriptor: "WRONG", category: "software" }]]) {
    await expect(enrichTransactions(fixture(items), [transaction], options)).rejects.toThrow("match");
  }
});

test("accepts Other and ignores unsupported categories", async () => {
  expect((await enrichTransactions(fixture([{ descriptor: transaction.name, category: "Other" }]), [transaction], options))[0]?.data).toEqual({ categorySlug: "other" });
  expect((await enrichTransactions(fixture([{ descriptor: transaction.name, category: "invented" }]), [transaction], options))[0]?.data).toEqual({});
});

test("enforces descriptor and batch limits before any call", async () => {
  const fake = fixture([]);
  await expect(enrichTransactions(fake, Array(21).fill(transaction), options)).rejects.toThrow("20");
  await expect(enrichTransactions(fake, [{ ...transaction, name: "ab" }], options)).rejects.toThrow("3 to 500");
  expect(fake.outcomeCalls).toHaveLength(0);
});
