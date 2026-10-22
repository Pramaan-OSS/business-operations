import { createTRPCRouter, protectedProcedure } from "@api/trpc/init";
import { deleteInboxAccount, getInboxAccountById, getInboxAccounts, upsertInboxAccount } from "@business-operations/db/queries";
import { Mailboxes } from "@business-operations/inbox/mailboxes";
import { triggerJob, getQueue } from "@business-operations/job-client";
import { unavailableMessage } from "@business-operations/pramaan";
import { TRPCError } from "@trpc/server";
import { createHash } from "node:crypto";
import { z } from "zod";
async function safely<T>(fn: () => Promise<T>) { try { return await fn(); } catch (error) { throw new TRPCError({ code: "PRECONDITION_FAILED", message: unavailableMessage(error) }); } }
export const inboxAccountsRouter = createTRPCRouter({
  get: protectedProcedure.query(({ ctx }) => getInboxAccounts(ctx.db, ctx.teamId!)),
  available: protectedProcedure.query(({ ctx }) => safely(() => new Mailboxes().accounts(`team.${ctx.teamId}`))),
  connect: protectedProcedure.input(z.object({ approved: z.literal(true) })).mutation(({ ctx, input }) => safely(async () => {
    const result = await new Mailboxes().start(`team.${ctx.teamId}`, `${process.env.BUSINESS_OPERATIONS_DASHBOARD_URL || "http://localhost:3001"}/inbox`, input.approved);
    return result.connectUrl;
  })),
  attach: protectedProcedure.input(z.object({ inbox: z.string().email() })).mutation(({ ctx, input }) => safely(async () => {
    const owned = (await new Mailboxes().accounts(`team.${ctx.teamId}`)).find(row => row.inbox === input.inbox && row.status === "active");
    if (!owned) throw new Error("Mailbox not found.");
    const row = await upsertInboxAccount(ctx.db, { teamId: ctx.teamId!, provider: "pramaan", email: owned.inbox,
      externalId: createHash("sha256").update(`${ctx.teamId}:${owned.ref}`).digest("hex"), accessToken: "", refreshToken: "", expiryDate: new Date().toISOString(), lastAccessed: new Date(0).toISOString() });
    if (!row) throw new Error("Mailbox could not be saved.");
    await triggerJob("initial-setup", { inboxAccountId: row.id }, "inbox-provider");
    return { id: row.id };
  })),
  delete: protectedProcedure.input(z.object({ id: z.string().uuid() })).mutation(({ ctx, input }) => safely(async () => {
    const row = await getInboxAccountById(ctx.db, { id: input.id, teamId: ctx.teamId! });
    if (!row) return null;
    if (row.provider !== "pramaan") throw new Error("Reconnect this mailbox from the Inbox page first.");
    await new Mailboxes().disconnect(`team.${ctx.teamId}`, row.email);
    await getQueue("inbox-provider").removeJobScheduler(`inbox-sync-${input.id}`);
    return deleteInboxAccount(ctx.db, { id: input.id, teamId: ctx.teamId! });
  })),
  sync: protectedProcedure.input(z.object({ id: z.string().uuid(), manualSync: z.boolean().optional() })).mutation(async ({ ctx, input }) => {
    const row = await getInboxAccountById(ctx.db, { id: input.id, teamId: ctx.teamId! });
    if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Mailbox not found." });
    return triggerJob("sync-scheduler", { id: input.id, manualSync: input.manualSync || false }, "inbox-provider");
  }),
});
