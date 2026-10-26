import { expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { demoFetch } from "../src/demo-transport";
import { createPramaan, pramaanFromEnv } from "../src/index";
test("offline mode runs checked bank reads and the logo job without network access", async () => {
  const oldKey = process.env.PRAMAAN_API_KEY, oldFake = process.env.PRAMAAN_FAKE;
  process.env.PRAMAAN_API_KEY = "dummy-offline"; process.env.PRAMAAN_FAKE = "1";
  try {
    const p = pramaanFromEnv()!;
    expect((await p.bankingInstitutionsSearch({ country: "GB" })).institutions[0]?.name).toBe("Demo bank");
    expect((await p.bankingAccountsList({ ref: `ref_${"0".repeat(26)}` })).accounts).toHaveLength(1);
    expect((await p.bankingTransactionsList({ ref: `ref_${"1".repeat(26)}`, from: "2026-01-01", to: "2026-12-31" })).transactions[0]?.amount).toBe(-1299);
    const logo = await p.companiesLogoGet({ domain: "example.test" });
    expect((await p.downloadHostedFile(logo.file)).length).toBe(logo.file.sizeBytes);
  } finally {
    if (oldKey === undefined) delete process.env.PRAMAAN_API_KEY; else process.env.PRAMAAN_API_KEY = oldKey;
    if (oldFake === undefined) delete process.env.PRAMAAN_FAKE; else process.env.PRAMAAN_FAKE = oldFake;
  }
});


test("offline app connections change for their owner on disconnect and reconnect", async () => {
  const p = createPramaan({ apiKey: "dummy-offline", fetch: demoFetch });
  const owner = `connection-${randomUUID()}`;
  const other = `connection-${randomUUID()}`;
  expect((await p.appsConnectionsList({ endUserRef: owner })).results).toHaveLength(3);
  await p.call("apps.connection.revoke", { app: "demo_accounting", endUserRef: owner }, { idempotencyKey: randomUUID() });
  expect((await p.appsConnectionsList({ endUserRef: owner })).results).toHaveLength(2);
  expect((await p.appsConnectionsList({ endUserRef: other })).results).toHaveLength(3);
  const result = await p.appsConnectionStart({ app: "demo_accounting", endUserRef: owner, redirectUrl: "http://localhost:3011/apps" }, { idempotencyKey: randomUUID() });
  expect(result.connectUrl).toBe("http://localhost:3011/apps");
  expect((await p.appsConnectionsList({ endUserRef: owner })).results).toHaveLength(3);
});


test("offline CSV suggestions are structured and use only the supplied headers", async () => {
  const p = createPramaan({ apiKey: "dummy-offline", fetch: demoFetch });
  const schema = { type: "object", properties: { date: { type: "string" }, description: { type: "string" }, counterparty: { type: "string" }, amount: { type: "string" } } };
  const result = await p.llmComplete({ maxTokens: 512, jsonSchema: schema, messages: [{ role: "user", content: "<csv_columns><column>Date</column><column>Merchant</column><column>Amount</column><column>Cardholder</column></csv_columns>" }] });
  expect(JSON.parse(result.text!)).toEqual({ date: "Date", description: "Merchant", amount: "Amount" });
});
