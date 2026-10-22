import { createHash } from "node:crypto";
import { requirePramaan, type Pramaan, type Caps, PramaanError, unavailableMessage } from "@business-operations/pramaan";
import { getObject, putObject } from "@business-operations/storage";
import { toMinorAmount } from "./utils/currency";

type Invoice = { id: string; amount: number; currency: string; invoiceNumber?: string | null };
type Payment = { state: "starting" | "ready" | "unknown"; kind: "link" | "checkout"; ref?: string; paymentLinkId?: string; url?: string; expiresAt?: string };
function details(invoice: Invoice) {
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(invoice.id)) throw new Error("Invalid invoice.");
  const currency = invoice.currency.toUpperCase();
  const amount = toMinorAmount(invoice.amount, currency);
  if (!/^[A-Z]{3}$/.test(currency) || !Number.isSafeInteger(amount) || amount < 1 || amount > 99999999) throw new Error("Check the invoice amount and currency.");
  const digest = createHash("sha256").update(`${amount}:${currency}`).digest("hex");
  return { amount, currency, key: `${invoice.id}/${digest}.json`, request: `invoice-checkout:${invoice.id}:${digest}`, linkRequest: `invoice-link:${invoice.id}:${digest}` };
}
async function save(key: string, value: Payment) { await putObject({ bucket: "invoice-payments", path: key, data: JSON.stringify(value) }); }
// Both entry paths prefer a payment link; saved checkouts continue to be reused.
export async function startInvoicePayment(invoice: Invoice, approved: boolean,
  _kind: "link" | "checkout", returnUrl: string, client: Pramaan = requirePramaan()) {
  if (!approved) throw new Error("Confirm the invoice payment before continuing.");
  const info = details(invoice);
  const saved = await getObject({ bucket: "invoice-payments", path: info.key });
  if (saved) {
    const existing = JSON.parse(saved.data.toString()) as Payment;
    if (existing.state !== "ready") throw new Error("Could not confirm the payment request. Check its status before trying again.");
    if (existing.kind === "link" && !existing.ref) throw new Error("An older payment request needs review before a new request can be created.");
    if (!existing.expiresAt || Date.parse(existing.expiresAt) > Date.now()) return { url: safeUrl(existing.url!) };
    if (existing.kind === "link") {
      const refreshed = await client.paymentLinkGet({ ref: existing.ref });
      if (["created", "partially_paid"].includes(refreshed.status) && matches(refreshed.amount, info) && refreshed.paymentUrl) {
        existing.url = safeUrl(refreshed.paymentUrl); existing.expiresAt = refreshed.linkExpiresAt;
        if (existing.expiresAt && Date.parse(existing.expiresAt) <= Date.now()) throw new Error("The payment page expired. Check its status before trying again.");
        await save(info.key, existing); return { url: existing.url };
      }
      throw new Error("The payment request needs review. Check its status before trying again.");
    }
    throw new Error("The payment page expired. Ask the business for a fresh payment request.");
  }
  const category = process.env.INVOICE_PAYMENT_TAX_CATEGORY;
  if (category && !["digital_products", "saas", "e_book", "edtech", "live_tutoring"].includes(category)) throw new Error("Check the invoice payment tax category in the installation settings.");
  const value: Payment = { state: "starting", kind: "link" };
  await save(info.key, value);
  try {
    try {
      const result = await client.paymentLinkCreate({ amount: info.amount, currency: info.currency, description: `Invoice ${invoice.invoiceNumber || invoice.id}`.slice(0, 100), reference: invoice.id, allowPartial: false, notifyEmail: false, notifySms: false, reminders: false,
        ...(category ? { taxCategory: category as Caps.PaymentTaxCategory } : {}) }, { idempotencyKey: info.linkRequest });
      if (!result.ref || !result.paymentUrl || !matches(result.amount, info)) throw new Error("The payment request could not be confirmed.");
      Object.assign(value, { ref: result.ref, url: safeUrl(result.paymentUrl), expiresAt: result.linkExpiresAt, state: "ready" });
    } catch (error) {
      // A lost response has no HTTP status and may already have created a link.
      if (!(error instanceof PramaanError) || error.status === undefined || error.jobId || !["upstream_unavailable", "connection_required"].includes(error.code)) throw error;
      value.kind = "checkout";
      await save(info.key, value);
      const result = await client.checkoutCreate({ lineItems: [{ name: `Invoice ${invoice.invoiceNumber || invoice.id}`, amount: info.amount, currency: info.currency.toLowerCase(), quantity: 1 }], successUrl: returnUrl, cancelUrl: returnUrl, mode: "payment" }, { idempotencyKey: info.request });
      if (!result.ref) throw new Error("The payment request could not be confirmed.");
      Object.assign(value, { ref: result.ref, url: safeUrl(result.checkoutUrl), expiresAt: result.expiresAt, state: "ready" });
    }
  } catch (error) {
    value.state = "unknown"; await save(info.key, value);
    const uncertain = error instanceof PramaanError && (error.jobId || error.code === "upstream_unavailable" && error.status === undefined);
    throw new Error(uncertain ? "Could not confirm the result. Check its status before trying again." : unavailableMessage(error));
  }
  await save(info.key, value);
  return { url: value.url };
}
function matches(amount: { amount: number; currency: string } | undefined, info: { amount: number; currency: string }) {
  return amount?.amount === info.amount && amount.currency === info.currency;
}
function safeUrl(value: string) {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password) throw new Error("The payment page could not be confirmed.");
  return url.toString();
}
export async function invoicePaymentStatus(invoice: Invoice, client: Pramaan = requirePramaan()) {
  const info = details(invoice);
  const saved = await getObject({ bucket: "invoice-payments", path: info.key });
  if (!saved) return { paid: false, status: "not_started" };
  const value = JSON.parse(saved.data.toString()) as Payment;
  if (value.state !== "ready") return { paid: false, status: "unknown" };
  if (value.kind === "link") {
    if (!value.ref) return { paid: false, status: "review_required" };
    const result = await client.paymentLinkGet({ ref: value.ref });
    const payments = result.payments || [];
    const unique = new Set(payments.map(row => row.ref)).size === payments.length;
    const consistent = payments.every(row => row.amount.currency === info.currency && row.amount.amount > 0);
    const captured = payments.reduce((sum, row) => sum + row.amount.amount, 0);
    return { paid: result.status === "paid" && matches(result.amount, info) && matches(result.amountPaid, info) && unique && consistent && captured === info.amount, status: result.status };
  }
  const result = await client.checkoutGet({ ref: value.ref }) as { status: string; payments: { status: string; amount?: { amount: number; currency: string } }[] };
  const captured = (result.payments || []).filter(row => row.status === "captured" && Number.isSafeInteger(row.amount?.amount) && row.amount!.amount > 0 && row.amount?.currency === info.currency).reduce((sum, row) => sum + (row.amount?.amount || 0), 0);
  return { paid: result.status === "paid" && captured === info.amount, status: result.status };
}

/** Called only from an approved invoice delivery or reminder job. */
export async function invoiceEmailPaymentUrl(invoice: { id: string; amount?: number | null; currency?: string | null; invoiceNumber?: string | null; status?: string | null; template?: unknown }, approved: boolean, returnUrl: string, client: Pramaan = requirePramaan()) {
  if ((invoice.template as { paymentEnabled?: boolean } | null)?.paymentEnabled !== true || ["paid", "canceled", "cancelled"].includes(invoice.status || "")) return undefined;
  return (await startInvoicePayment({ id: invoice.id, amount: invoice.amount ?? 0, currency: invoice.currency || "", invoiceNumber: invoice.invoiceNumber }, approved, "link", returnUrl, client)).url;
}
