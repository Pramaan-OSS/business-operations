import { bankProviderView } from "@business-operations/db/bank-provider";
import { createTRPCRouter, protectedProcedure } from "@api/trpc/init";
import { getBankConnections, deleteBankConnection } from "@business-operations/db/queries";
import { BankFeeds } from "@business-operations/banking/feeds";
import { getQueue } from "@business-operations/job-client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

export const bankConnectionsRouter = createTRPCRouter({
  get: protectedProcedure.input(z.object({ enabled: z.boolean().optional() }).optional()).query(async ({ ctx, input }) =>
    (await getBankConnections(ctx.db, { teamId: ctx.teamId!, enabled: input?.enabled })).map(row => ({ ...row, provider: bankProviderView(row.provider), reconnectRequired: row.provider !== "pramaan" }))),
  delete: protectedProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const records = await getBankConnections(ctx.db, { teamId: ctx.teamId! });
    const record = records.find(connection => connection.id === input.id);
    if (!record) throw new TRPCError({ code: "NOT_FOUND", message: "Bank connection not found." });
    if (record.provider === "pramaan" && record.referenceId && record.enrollmentId) {
      await new BankFeeds().revoke(`${ctx.teamId}:${record.enrollmentId}`, record.referenceId);
      await getQueue("bank-feeds").removeJobScheduler(`bank-${ctx.teamId}-${record.referenceId}`);
    } else throw new TRPCError({ code: "PRECONDITION_FAILED", message: "This connection must be disconnected in its original account first." });
    return deleteBankConnection(ctx.db, { id: input.id, teamId: ctx.teamId! });
  }),
});
