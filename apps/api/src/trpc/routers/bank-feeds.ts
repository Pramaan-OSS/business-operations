import { syncBankConnection } from "@business-operations/db/bank-sync";
import { getQueue, queueBankImportJobs } from "@business-operations/job-client";
import { BANK_POLL_INTERVAL_MS } from "@business-operations/banking/feeds";
import { createTRPCRouter, protectedProcedure } from "@api/trpc/init";
import { BankFeeds, BANK_CONSENT_NOTICE } from "@business-operations/banking/feeds";
import { unavailableMessage, BankReturnAddressError } from "@business-operations/pramaan";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
const feeds = new BankFeeds();
const id = z.object({ id: z.string().uuid() });
function owner(teamId: string | undefined, userId: string) {
  if (!teamId) throw new TRPCError({ code: "FORBIDDEN", message: "Choose a team first." });
  return `${teamId}:${userId}`;
}
async function safely<T>(action: () => Promise<T>) {
  try { return await action(); } catch (error) { throw new TRPCError({ code: "PRECONDITION_FAILED", message: error instanceof BankReturnAddressError ? error.message : unavailableMessage(error) }); }
}
export const bankFeedsRouter = createTRPCRouter({
  connections: protectedProcedure.query(({ ctx }) => safely(() => feeds.connections(owner(ctx.teamId, ctx.session.user.id)))),
  revoke: protectedProcedure.input(id.extend({ approved: z.literal(true) })).mutation(({ ctx, input }) => safely(() => feeds.revoke(owner(ctx.teamId, ctx.session.user.id), input.id))),
  notice: protectedProcedure.query(() => BANK_CONSENT_NOTICE),
  institutions: protectedProcedure.input(z.object({ country: z.string().regex(/^[A-Z]{2}$/), query: z.string().min(1).max(200).optional(), cursor: z.string().max(4096).optional() }))
    .query(({ input }) => safely(() => feeds.institutions(input))),
  start: protectedProcedure.input(z.object({ country: z.string().regex(/^[A-Z]{2}$/), institutionRef: z.string().max(1024).optional(), approved: z.literal(true) }))
    .mutation(({ ctx, input }) => safely(async () => {
      const result = await feeds.start(owner(ctx.teamId, ctx.session.user.id), {
      country: input.country, institutionRef: input.institutionRef,
      returnUrl: `${process.env.BUSINESS_OPERATIONS_DASHBOARD_URL || "http://localhost:3001"}/banking`,
    }, input.approved);
      return process.env.PRAMAAN_FAKE === "1" ? { ...result, connectUrl: `${process.env.BUSINESS_OPERATIONS_DASHBOARD_URL || "http://localhost:3001"}/banking?bankConnection=${result.id}` } : result;
    })),
  status: protectedProcedure.input(id).query(({ ctx, input }) => safely(() => feeds.status(owner(ctx.teamId, ctx.session.user.id), input.id))),
  accounts: protectedProcedure.input(id).query(({ ctx, input }) => safely(() => feeds.accounts(owner(ctx.teamId, ctx.session.user.id), input.id))),
  transactions: protectedProcedure.input(id).query(({ ctx, input }) => safely(() => feeds.transactions(owner(ctx.teamId, ctx.session.user.id), input.id))),
  sync: protectedProcedure.input(id).mutation(({ ctx, input }) => safely(async () => {
    owner(ctx.teamId, ctx.session.user.id);
    const context = { teamId: ctx.teamId!, userId: ctx.session.user.id, connectionId: input.id };
    const result = await syncBankConnection(ctx.db, context, feeds, imported => queueBankImportJobs(ctx.teamId!, imported));
    await getQueue("bank-feeds").upsertJobScheduler(`bank-${ctx.teamId}-${input.id}`, { every: BANK_POLL_INTERVAL_MS }, { name: "sync-bank-feed", data: context, opts: { attempts: 1 } });
    return result;
  })),
});
