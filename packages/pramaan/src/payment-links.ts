import { PramaanError } from "./sdk/errors";
export const PAYMENT_TAX_CATEGORIES = ["digital_products", "saas", "e_book", "edtech", "live_tutoring"] as const;
const statuses = ["created", "partially_paid", "paid", "expired", "canceled", "unknown"];
const reference = (value: unknown) => typeof value === "string" && /^(ref_[0-9A-HJKMNP-TV-Z]{26}|rh_[A-Za-z0-9_-]{24,1024})$/.test(value);
const rowReference = (value: unknown) => typeof value === "string" && /^rh_[A-Za-z0-9_-]{24,1024}$/.test(value);
const money = (value: any) => !!value && Number.isSafeInteger(value.amount) && value.amount >= 0 && /^[A-Z]{3}$/.test(value.currency);
export function validatePaymentLinks(id: string, phase: "input" | "result", value: unknown) {
  if (!["payments.payment-link.create", "payments.payment-link.get"].includes(id)) return;
  const fail = (): never => { throw new PramaanError(phase === "input" ? "invalid_request" : "internal", "Could not confirm the payment request."); };
  if (!value || typeof value !== "object" || Array.isArray(value)) return fail();
  const v = value as Record<string, any>;
  if (phase === "input") {
    if (id.endsWith(".create")) {
      if (!Number.isSafeInteger(v.amount) || v.amount < 1 || v.amount > 99999999 || !/^[A-Z]{3}$/.test(v.currency)) return fail();
      if (v.taxCategory !== undefined && !PAYMENT_TAX_CATEGORIES.includes(v.taxCategory)) return fail();
      for (const key of ["allowPartial", "notifyEmail", "notifySms", "reminders"])
        if (v[key] !== undefined && typeof v[key] !== "boolean") return fail();
    } else if ((v.ref === undefined) === (v.paymentLinkId === undefined) || v.ref !== undefined && !reference(v.ref) || v.paymentLinkId !== undefined && (typeof v.paymentLinkId !== "string" || !v.paymentLinkId)) return fail();
    return;
  }
  if (typeof v.paymentLinkId !== "string" || !v.paymentLinkId || !statuses.includes(v.status)) return fail();
  if (v.ref !== undefined && !reference(v.ref)) return fail();
  for (const key of ["amount", "amountPaid"]) if (v[key] !== undefined && !money(v[key])) return fail();
  if (v.payments !== undefined && (!Array.isArray(v.payments) || v.payments.length > 50 || v.payments.some((row: any) => !row || !rowReference(row.ref) || !money(row.amount)))) return fail();
  for (const key of ["linkExpiresAt", "expiresAt"]) if (v[key] !== undefined && (typeof v[key] !== "string" || !/^\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/.test(v[key]) || !Number.isFinite(Date.parse(v[key])))) return fail();
  if (v.paymentUrl !== undefined) {
    if (typeof v.paymentUrl !== "string") return fail();
    try { const url = new URL(v.paymentUrl); if (url.protocol !== "https:" || url.username || url.password) return fail(); }
    catch { return fail(); }
  }
}
