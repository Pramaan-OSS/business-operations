import { receiveImessage } from "@business-operations/storage";
import { createTRPCRouter, protectedProcedure } from "@api/trpc/init";
import { reviewOutcome, approveOutcome, outcomeStatus } from "@business-operations/storage/outcomes";
import { workflowAppChoices } from "@business-operations/storage/workflow-apps";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { requirePramaan, unavailableMessage, emailSender } from "@business-operations/pramaan";
const source = z.object({ country: z.literal("US"), state: z.string().regex(/^[A-Z]{2}$/), zip: z.string().min(5).max(10) });
const invoiceInput = z.object({ app: z.string().regex(/^[a-z0-9_-]{1,64}$/), taxApp: z.string().regex(/^[a-z0-9_-]{1,64}$/), content: z.string().min(1).max(14000000).describe("PDF document bytes, encoded for upload."), supplierRef: z.string().min(1).max(128).describe("Supplier reference from your connected account."), supplierName: z.string().min(2).max(200), ownerRef: z.string().min(1).max(128).describe("Owner reference from the supplier record."), expenseAccountRef: z.string().min(1).max(128).describe("Expense account reference from your chart of accounts."), from: source.describe("Supplier address"), to: source.describe("Business address") });
const invoice = z.object({ outcome: z.literal("invoice.process"), input: invoiceInput, book: z.boolean().default(false) });
const range = z.object({ from: z.string().datetime({ offset: true }), to: z.string().datetime({ offset: true }) });
const reconciliationInput = range.extend({ currency: z.string().regex(/^[A-Z]{3}$/) });
const reconciliation = z.object({ outcome: z.literal("payments.reconcile"), input: reconciliationInput });
const address = z.object({ country: z.string().length(2), state: z.string().min(1), postalCode: z.string().min(1), city: z.string().min(1), line1: z.string().min(1) });
const taxInput = z.object({ app: z.string().regex(/^[a-z0-9_-]{1,64}$/), orderKey: z.string().min(1).max(100), amountMinor: z.number().int().min(0).max(1000000000).describe("Subtotal in the currency's smallest units. For GBP, 100 means £1.00. Shipping is excluded."), currency: z.string().regex(/^[A-Z]{3}$/), origin: address, destination: address, productType: z.enum(["good", "service"]), taxCode: z.string().min(1).max(100).describe("Product tax code selected from your connected tax account.") });
const taxQuote = z.object({ outcome: z.literal("tax.quote"), input: taxInput });
const notification = z.object({ outcome: z.literal("notify.send"), input: z.object({ message: z.string().min(1).max(1600), email: z.string().email().optional(), phone: z.string().regex(/^\+[1-9]\d{1,14}$/).optional(), subject: z.string().max(200).optional(), plainSms: z.boolean().optional() }).refine(value => !!value.email || !!value.phone, "Choose a recipient.") });
const cashflow = z.object({ outcome: z.literal("cashflow.report"), input: z.object({ dataRange: range }) });
const revenue = z.object({ outcome: z.literal("revenue.summary"), input: z.object({ days: z.number().int().min(1).max(90).default(30) }) });
const reviewSchema = z.discriminatedUnion("outcome", [invoice, reconciliation, taxQuote, notification, cashflow, revenue]);
const ids = z.enum(["invoice.process", "payments.reconcile", "tax.quote", "notify.send", "cashflow.report", "revenue.summary"]);
function owner(teamId: string | undefined, userId: string) { if (!teamId) throw new TRPCError({ code: "FORBIDDEN", message: "Choose a team first." }); return `${teamId}:${userId}`; }
async function safely<T>(action: () => Promise<T>) { try { return await action(); } catch (error) { throw new TRPCError({ code: "PRECONDITION_FAILED", message: unavailableMessage(error) }); } }
export const workflowsRouter = createTRPCRouter({
  incomingImessage: protectedProcedure.input(z.object({ sender: z.string().min(1).max(320), contact: z.string().min(1).max(320), after: z.string().datetime({ offset: true }).optional(), waitSeconds: z.number().int().min(1).max(900).default(20) })).mutation(({ ctx, input }) => safely(async () => {
    if (!ctx.teamId || process.env.PRAMAAN_MESSAGING_TEAM_ID !== ctx.teamId) throw new Error("Incoming messages are not set up yet for this team.");
    return receiveImessage(owner(ctx.teamId, ctx.session.user.id), input);
  })),
  incomingSms: protectedProcedure.input(z.object({ to: z.string().regex(/^\+[1-9]\d{1,14}$/), cursor: z.string().max(1024).optional() })).query(({ ctx, input }) => safely(async () => {
    if (!ctx.teamId || process.env.PRAMAAN_MESSAGING_TEAM_ID !== ctx.teamId) throw new Error("Incoming messages are not set up yet. Set PRAMAAN_MESSAGING_TEAM_ID for the team that owns the receiving number.");
    const result = await requirePramaan().smsInboundMessagesList({ ...input, limit: 50 });
    return { results: result.results.map(row => ({ from: row.from, to: row.to, text: row.contentType === "text" ? row.body : undefined, receivedAt: row.receivedAt, contentType: row.contentType })), nextCursor: result.nextCursor };
  })),
  forms: protectedProcedure.query(async ({ ctx }) => {
    const endUserRef = `${ctx.teamId}.${ctx.session.user.id}`;
    const [invoiceChoices, taxChoices] = await Promise.all([
      workflowAppChoices(endUserRef, "invoice.process").catch(() => ({ app: [], taxApp: [] })),
      workflowAppChoices(endUserRef, "tax.quote").catch(() => ({ app: [] })),
    ]);
    const schema = (value: z.ZodType) => z.toJSONSchema(value) as Record<string, any>;
    const invoiceForm = schema(invoiceInput.omit({ content: true }));
    for (const field of ["app", "taxApp"] as const) invoiceForm.properties[field] = { type: "string", enum: invoiceChoices[field] ?? [] };
    const taxForm = schema(taxInput);
    taxForm.properties.app.enum = taxChoices.app ?? [];
    const operator = process.env.PRAMAAN_SETTLEMENT_REPORTS_TEAM_ID === ctx.teamId;
    return [
      { id: "invoice.process" as const, label: "Check or book an invoice", schema: invoiceForm, available: ["app", "taxApp"].every(key => invoiceForm.properties[key].enum.length), note: "Booking requires supported accounting and tax connections, a PDF, and US supplier and business addresses." },
      { id: "tax.quote" as const, label: "Quote tax", schema: taxForm, available: !!taxForm.properties.app.enum.length, note: "Choose the connected account that calculates tax for this order." },
      { id: "payments.reconcile" as const, label: "Reconcile settlements", schema: schema(reconciliationInput), available: operator, note: "Reads the installation owner's settlement account. Set PRAMAAN_SETTLEMENT_REPORTS_TEAM_ID for its team." },
      { id: "cashflow.report" as const, label: "Cashflow narrative", schema: schema(cashflow.shape.input), available: operator && !!process.env.PRAMAAN_CASHFLOW_SESSION_REF, note: "Reads an existing, owned financial-data session. Set PRAMAAN_CASHFLOW_SESSION_REF for the reporting team." },
      { id: "revenue.summary" as const, label: "Revenue narrative", schema: schema(revenue.shape.input), available: operator, note: "Reads the installation owner's subscription and charges account, not a team's connected payments app." },
    ];
  }),
  review: protectedProcedure.input(z.object({ outcome: ids, input: z.record(z.string(), z.unknown()), book: z.boolean().optional() }).transform(value => reviewSchema.parse(value)))
    .mutation(({ ctx, input }) => safely(async () => {
      const own = owner(ctx.teamId, ctx.session.user.id);
      if (input.outcome === "notify.send") {
        if (process.env.PRAMAAN_MESSAGING_TEAM_ID !== ctx.teamId) throw new Error("This feature is not available yet.");
        return reviewOutcome(own, input.outcome, { ...input.input, ...(input.input.email ? { from: emailSender() } : {}) });
      }
      if (input.outcome === "invoice.process" || input.outcome === "tax.quote") {
        const endUserRef = `${ctx.teamId}.${ctx.session.user.id}`;
        const choices = await workflowAppChoices(endUserRef, input.outcome);
        if (!choices.app?.includes(input.input.app) || input.outcome === "invoice.process" && !choices.taxApp?.includes(input.input.taxApp)) throw new Error("This feature is not available yet.");
        return reviewOutcome(own, input.outcome, { ...input.input, endUserRef }, input.outcome === "invoice.process" ? { book: input.book } : {});
      }
      if (process.env.PRAMAAN_SETTLEMENT_REPORTS_TEAM_ID !== ctx.teamId) throw new Error("This feature is not available yet.");
      if (input.outcome === "revenue.summary") return reviewOutcome(own, input.outcome, {}, { days: input.input.days, summary: true });
      const dates = input.outcome === "cashflow.report" ? input.input.dataRange : input.input;
      if (Date.parse(dates.from) >= Date.parse(dates.to)) throw new Error("Choose an end date after the start date.");
      if (input.outcome === "cashflow.report") {
        if (!process.env.PRAMAAN_CASHFLOW_SESSION_REF) throw new Error("This feature is not available yet.");
        return reviewOutcome(own, input.outcome, { ...input.input, sessionRef: process.env.PRAMAAN_CASHFLOW_SESSION_REF }, { narrative: true, limit: 500 });
      }
      return reviewOutcome(own, input.outcome, input.input);
    })),
  approve: protectedProcedure.input(z.object({ id: z.string().uuid(), approved: z.literal(true) })).mutation(({ ctx, input }) => safely(() => approveOutcome(owner(ctx.teamId, ctx.session.user.id), input.id, input.approved))),
  status: protectedProcedure.input(z.object({ id: z.string().uuid() })).query(({ ctx, input }) => safely(() => outcomeStatus(owner(ctx.teamId, ctx.session.user.id), input.id))),
  cancel: protectedProcedure.input(z.object({ id: z.string().uuid() })).mutation(({ ctx, input }) => safely(() => outcomeStatus(owner(ctx.teamId, ctx.session.user.id), input.id, true))),
});
