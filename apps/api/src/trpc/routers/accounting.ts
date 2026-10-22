import { createTRPCRouter, protectedProcedure } from "@api/trpc/init";
import { getTransactionsByIds, getAccountingSyncStatus } from "@business-operations/db/queries";
import { ConnectedApps } from "@business-operations/storage/connected-apps";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
const providerId = z.string().regex(/^[a-z0-9_-]{1,64}$/);
export const accountingRouter = createTRPCRouter({
  actions: protectedProcedure.input(z.object({ app: providerId.optional() })).query(({ input }) => new ConnectedApps().catalog("accounting transactions invoices bills chart of accounts", input.app)),
  export: protectedProcedure.input(z.object({ transactionIds: z.array(z.string().uuid()).min(1).max(500) }))
    .mutation(async ({ ctx, input }) => {
      const rows = await getTransactionsByIds(ctx.db, { teamId: ctx.teamId!, ids: input.transactionIds });
      if (rows.length !== new Set(input.transactionIds).size) throw new TRPCError({ code: "NOT_FOUND", message: "Some transactions could not be found." });
      return { transactions: rows, requiresApproval: true };
    }),
  getSyncStatus: protectedProcedure.input(z.object({ transactionIds: z.array(z.string().uuid()).optional(), providerId: providerId.optional() }))
    .query(({ ctx, input }) => getAccountingSyncStatus(ctx.db, { teamId: ctx.teamId!, transactionIds: input.transactionIds, provider: input.providerId })),
});
