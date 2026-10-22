import type { JobsOptions } from "bullmq";

/**
 * Default job options for BullMQ jobs.
 * One attempt by default: uncertain external effects require a person to check.
 */
export const DEFAULT_JOB_OPTIONS: JobsOptions = {
  attempts: 1,
  backoff: {
    type: "exponential",
    delay: 1000,
  },
};
