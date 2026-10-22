import { createTRPCRouter, protectedProcedure } from "@api/trpc/init";
import { pramaanKeySet } from "@business-operations/pramaan";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

export const invoicePaymentsRouter = createTRPCRouter({
  paymentStatus: protectedProcedure.query(() => ({ connected: pramaanKeySet(), status: pramaanKeySet() ? "configured" : "not_set_up" })),
  refundPayment: protectedProcedure.input(z.object({ invoiceId: z.string().uuid() })).mutation(() => {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Refunds are not available yet. Check the payment in your connected account." });
  }),
});
