import { expect, test } from "bun:test";
import { registerInvoiceTools } from "../mcp/tools/invoices";
import { registerInvoiceRecurringTools } from "../mcp/tools/invoice-recurring";
import { registerTransactionTools } from "../mcp/tools/transactions";
test("automated delivery actions return a dashboard review without touching records or queues", async () => {
 const handlers = new Map<string, (...args: any[]) => any>();
 const server = { registerTool: (name: string, _definition: unknown, handler: (...args: any[]) => any) => { handlers.set(name, handler); } };
 const db = new Proxy({}, { get() { throw new Error("Delivery approval must happen before any change."); } });
 const ctx = { db, teamId: "owned-team", userId: "owned-user", scopes: ["invoices.write", "transactions.write"], apiUrl: "http://localhost:3002" };
 registerInvoiceTools(server as any, ctx as any);registerInvoiceRecurringTools(server as any, ctx as any);registerTransactionTools(server as any, ctx as any);
 for (const [name, input] of [["invoices_send", { id: "example" }], ["invoices_remind", { id: "example" }], ["invoice_recurring_create", {}], ["invoice_recurring_resume", { id: "example" }], ["transactions_export", { sendEmail: true }]] as const) {
  expect(handlers.has(name)).toBe(true);
  const result = await handlers.get(name)!(input);
  expect(result.structuredContent.approvalRequired).toBe(true);
  expect(result.structuredContent.message).toContain("Nothing has been sent.");
 }
});
