import { expect, test } from "bun:test";
import { FakePramaan } from "@business-operations/pramaan/fake";
import { mkdir, mkdtemp } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { putObject, signedUrl } from "@business-operations/storage";
import { DocumentClient } from "./client";
import { DocumentClassifier } from "./classifier/classifier";

const extracted = { name: "Example Shop", date: "2026-10-15", amount: 25.5, currency: "GBP", website: null, description: "Office supplies", tax_amount: null, tax_rate: null, tax_type: null, invoice_number: null, document_type: "receipt" };

test("manual intake sends the stored bytes rather than an inaccessible local URL", async () => {
  const scratch = fileURLToPath(new URL("../../../.scratch/", import.meta.url));
  await mkdir(scratch, { recursive: true });
  const root = process.env.STORAGE_ROOT;
  const secret = process.env.FILE_KEY_SECRET;
  process.env.STORAGE_ROOT = await mkdtemp(`${scratch}documents-`);
  process.env.FILE_KEY_SECRET = "test-secret";
  const fake = new FakePramaan({ "document.extract": () => ({ data: extracted, truncated: false }) });
  try {
    await putObject({ bucket: "vault", path: "team/receipt.pdf", data: "%PDF-1.4 receipt" });
    const link = await signedUrl({ bucket: "vault", path: "team/receipt.pdf", expireIn: 60 });
    const result = await new DocumentClient(fake).getInvoiceOrReceipt({ documentUrl: link.signedUrl, mimetype: "application/pdf" });
    expect(result).toMatchObject({ name: "Example Shop", amount: 25.5, type: "expense", document_type: "receipt" });
    expect(fake.calls[0]?.input).toMatchObject({ content: Buffer.from("%PDF-1.4 receipt").toString("base64") });
    expect(fake.calls[0]?.input).not.toHaveProperty("url");
    expect(fake.outcomeCalls).toHaveLength(0);
  } finally {
    if (root === undefined) delete process.env.STORAGE_ROOT; else process.env.STORAGE_ROOT = root;
    if (secret === undefined) delete process.env.FILE_KEY_SECRET; else process.env.FILE_KEY_SECRET = secret;
  }
});

test("missing and malformed extracted fields are refused", async () => {
  const fake = new FakePramaan({ "document.extract": () => ({ data: { amount: "25" }, truncated: false }) });
  await expect(new DocumentClient(fake).getInvoiceOrReceipt({ content: "cGRm", mimetype: "application/pdf" })).rejects.toThrow();
});

test("document classification calls the outcome and extracts metadata without model prompts", async () => {
  const fake = new FakePramaan({ "document.extract": () => ({ data: { title: "Office receipt", summary: null, date: null, tags: ["receipt"], language: "english" }, truncated: false }) });
  fake.routeOutcomes({
    estimate: () => ({ ready: true, canRun: true, plan: "p1", steps: [] }),
    run: () => ({ status: "done", steps: [], result: { kind: "receipt", characters: 100, truncated: false } }),
  });
  expect((await new DocumentClassifier(fake).classifyDocument({ content: "RECEIPT" })).title).toBe("Office receipt");
  expect(fake.outcomeCalls[1]).toMatchObject({ id: "document.classify", input: { content: Buffer.from("RECEIPT").toString("base64"), extension: "txt" } });
  expect(fake.callsTo("llm.complete")).toHaveLength(0);
});


test.each(["invoice", "receipt", "other"] as const)("intake maps %s to a supported inbox type", async documentType => {
  const fake = new FakePramaan({ "document.extract": () => ({ data: { ...extracted, document_type: documentType }, truncated: false }) });
  const result = await new DocumentClient(fake).getInvoiceOrReceipt({ content: "cGRm", mimetype: "application/pdf" });
  expect(result.document_type).toBe(documentType);
  expect(result.type).toBe(documentType === "receipt" ? "expense" : documentType);
});

test("truncated extraction never becomes a complete receipt", async () => {
 const fake = new FakePramaan({ "document.extract": () => ({ data: extracted, truncated: true }) });
 await expect(new DocumentClient(fake).getInvoiceOrReceipt({ content: "cGRm", mimetype: "application/pdf" })).rejects.toThrow("cut short");
});
test("the old bare extraction fixture is refused", async () => {
 const fake = new FakePramaan({ "document.extract": () => extracted });
 await expect(new DocumentClient(fake).getInvoiceOrReceipt({ content: "cGRm", mimetype: "application/pdf" })).rejects.toThrow("could not be confirmed");
});

test("receipt intake polls the accepted job and reads its completed data envelope", async () => {
 const fake = new FakePramaan({ "document.extract": () => ({ id: "extract-job", status: "running" }) });
 fake.routeJobs({ get: () => ({ id: "extract-job", capability: "document.extract", status: "done", result: { data: extracted, truncated: false } }) });
 const result = await new DocumentClient(fake).getInvoiceOrReceipt({ content: "cGRm", mimetype: "application/pdf" });
 expect(result.amount).toBe(25.5);
 expect(fake.jobCalls).toEqual([{ verb: "get", id: "extract-job" }]);
});

test.each([
 ["18/10/2026", "2026-10-18"], ["10/18/2026", "2026-10-18"], ["2026-10-18", "2026-10-18"],
 ["2026-02-30", null], ["03/04/2026", null], ["not a date", null],
])("normalizes extracted date %s without guessing", async (date, expected) => {
 const fake = new FakePramaan({ "document.extract": () => ({ data: { ...extracted, date }, truncated: false }) });
 expect((await new DocumentClient(fake).getInvoiceOrReceipt({ content: "cGRm", mimetype: "application/pdf" })).date).toBe(expected);
});
