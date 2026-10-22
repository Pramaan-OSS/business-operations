import { z } from "zod";

/**
 * Rates job schemas (independent from @business-operations/jobs)
 */

export const ratesSchedulerSchema = z.object({
  // Empty payload - scheduler runs globally
});

export type RatesSchedulerPayload = z.infer<typeof ratesSchedulerSchema>;
