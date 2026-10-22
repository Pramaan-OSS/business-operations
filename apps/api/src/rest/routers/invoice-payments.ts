import { OpenAPIHono } from "@hono/zod-openapi";
import { publicMiddleware } from "@api/rest/middleware";
import type { Context } from "@api/rest/types";
import { getInvoiceById, updateInvoice } from "@business-operations/db/queries";
import { verify } from "@business-operations/invoice/token";
import { startInvoicePayment, invoicePaymentStatus } from "@business-operations/invoice/payments";
import { unavailableMessage } from "@business-operations/pramaan";
import { z } from "zod";
import type { Context as HonoContext } from "hono";

const app = new OpenAPIHono<Context>();
app.use("*", ...publicMiddleware);
const request = z.object({ token: z.string().min(1).max(4096), approved: z.boolean().optional(), expectedAmount: z.number().optional(), expectedCurrency: z.string().optional(), mode: z.enum(["link", "checkout"]).default("link") });
async function readInvoice(c: HonoContext<Context>, body: z.infer<typeof request>) {
  const decoded = await verify(decodeURIComponent(body.token));
  if (typeof decoded.id !== "string") throw new Error("Invalid invoice link.");
  const invoice = await getInvoiceById(c.get("db"), { id: decoded.id });
  if (!invoice || !invoice.amount || !invoice.currency) throw new Error("Invoice not found.");
  return invoice;
}
app.post("/checkout", async c => {
  try {
    const body = request.parse(await c.req.json());
    const invoice = await readInvoice(c, body);
    if (!["unpaid", "overdue"].includes(invoice.status || "") || !(invoice.template as { paymentEnabled?: boolean })?.paymentEnabled)
      return c.json({ message: "This invoice cannot accept a payment." }, 400);
    if (body.approved !== true) return c.json({ message: "Confirm the invoice payment before continuing." }, 400);
    if (body.expectedAmount !== invoice.amount || body.expectedCurrency?.toUpperCase() !== invoice.currency?.toUpperCase())
      return c.json({ message: "The invoice changed. Reload it and review the amount again." }, 409);
    const origin = process.env.BUSINESS_OPERATIONS_DASHBOARD_URL || "http://localhost:3001";
    const returnUrl = `${origin}/i/${encodeURIComponent(body.token)}`;
    const result = await startInvoicePayment({ id: invoice.id, amount: invoice.amount!, currency: invoice.currency!, invoiceNumber: invoice.invoiceNumber }, true, body.mode, returnUrl);
    return c.json(result);
  } catch (error) { return c.json({ message: unavailableMessage(error) }, 503); }
});
app.post("/status", async c => {
  try {
    const body = request.parse(await c.req.json());
    const invoice = await readInvoice(c, body);
    const result = await invoicePaymentStatus({ id: invoice.id, amount: invoice.amount!, currency: invoice.currency! });
    if (result.paid && invoice.status !== "paid") await updateInvoice(c.get("db"), { id: invoice.id, teamId: invoice.teamId, status: "paid", paidAt: new Date().toISOString() });
    return c.json(result);
  } catch (error) { return c.json({ message: unavailableMessage(error) }, 503); }
});
export { app as invoicePaymentsRouter };
