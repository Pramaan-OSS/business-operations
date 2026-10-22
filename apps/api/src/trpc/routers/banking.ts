import { createTRPCRouter, internalProcedure } from "@api/trpc/init";
import { getRates } from "@business-operations/banking/rates";
export const bankingRouter = createTRPCRouter({
  rates: internalProcedure.query(async () => ({ data: await getRates() })),
});
