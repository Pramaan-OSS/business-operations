import { validateDocumentExtraction } from "./document-extraction";
import type { Pramaan } from "./index";
import type { CapId } from "./index";
import { PramaanError } from "./sdk/errors";
import { toOutcomeRun } from "./sdk/client";
import type { OutcomeRun, OutcomeRunOptions, WaitOptions } from "./sdk/types";

export const CHECK_RESULT = "Could not confirm the result. Check its status before trying again.";

export class OutcomeStopped extends PramaanError {
  constructor(
    readonly reason: "cancelled" | "rate_limited" | "timeout" | "unknown" | "failed" | "approval",
    jobId?: string,
    retryAfterMs?: number,
  ) {
    super(reason === "rate_limited" ? "rate_limited" : reason === "timeout" ? "upstream_timeout" : "conflict",
      reason === "cancelled" ? "The request was cancelled."
        : reason === "rate_limited" ? "Too many requests. Wait before trying again."
        : reason === "approval" ? "This request needs your approval before it can run."
        : CHECK_RESULT,
      { jobId, retryAfterMs, retryable: false });
  }
}

/** One read-only asynchronous capability, with the same stop/status behavior as outcomes. */
export async function runReadOnlyCapability(client: Pramaan, id: CapId, input: unknown,
  options: WaitOptions & { idempotencyKey?: string } = {}): Promise<unknown> {
  if (client.info(id)?.effectClass !== "read_only") throw new OutcomeStopped("approval");
  if (options.signal?.aborted) throw new OutcomeStopped("cancelled");
  let jobId: string | undefined;
  try {
    const started = await client.run(id, input, { idempotencyKey: options.idempotencyKey });
    if (!started || typeof started !== "object" || !("id" in started) || !("status" in started)) return id === "document.extract" ? validateDocumentExtraction(started) : started;
    jobId = String(started.id);
    const job = await client.jobs.wait(jobId, options);
    if (job.status !== "done") throw new OutcomeStopped(job.status === "cancelled" ? "cancelled" : "failed", jobId);
    return id === "document.extract" ? validateDocumentExtraction(job.result) : job.result;
  } catch (error) {
    if (error instanceof OutcomeStopped) throw error;
    if (error instanceof PramaanError && error.code === "rate_limited") throw new OutcomeStopped("rate_limited", jobId, error.retryAfterMs);
    if (error instanceof PramaanError && error.code === "upstream_timeout") throw new OutcomeStopped("timeout", jobId);
    if (jobId) throw new OutcomeStopped("unknown", jobId);
    throw error;
  }
}

/** Only read-only work may use this path. Sending and payments need a separate approved plan. */
export async function runReadOnlyOutcome(
  client: Pramaan,
  id: string,
  input: unknown,
  options: OutcomeRunOptions & Pick<WaitOptions, "timeoutMs"> = {},
): Promise<OutcomeRun> {
  try {
    return await runChecked(client, id, input, options);
  } catch (error) {
    if (error instanceof OutcomeStopped) throw error;
    if (error instanceof PramaanError && error.code === "rate_limited")
      throw new OutcomeStopped("rate_limited", error.jobId, error.retryAfterMs);
    if (error instanceof PramaanError && error.code === "upstream_timeout")
      throw new OutcomeStopped("timeout", error.jobId);
    throw error;
  }
}

async function runChecked(
  client: Pramaan,
  id: string,
  input: unknown,
  options: OutcomeRunOptions & Pick<WaitOptions, "timeoutMs">,
): Promise<OutcomeRun> {
  if (options.signal?.aborted) throw new OutcomeStopped("cancelled");
  const estimate = await client.outcomes.estimate(id, input, options);
  if (estimate.requiresApproval || estimate.steps.some(step => step.requiresApproval || step.effectClass !== "read_only"))
    throw new OutcomeStopped("approval");
  if (!estimate.ready || !estimate.canRun)
    throw new OutcomeStopped("failed");
  if (options.signal?.aborted) throw new OutcomeStopped("cancelled");

  let jobId: string | undefined;
  let report: OutcomeRun;
  try {
    // Starts are never retried, including a 429: a timeout may hide an accepted job.
    const started = await client.outcomes.start(id, input, { ...options, plan: estimate.plan, retry: false });
    if ("id" in started) {
      jobId = started.id;
      const job = await client.jobs.wait(jobId, { signal: options.signal, timeoutMs: options.timeoutMs ?? 36 * 60_000 });
      if (job.result === undefined) throw new OutcomeStopped(job.status === "cancelled" ? "cancelled" : "failed", jobId);
      report = toOutcomeRun(job.result);
      if (report.steps.some(step => step.effect === "unknown")) throw new OutcomeStopped("unknown", jobId);
      if (job.status !== "done") throw new OutcomeStopped(job.status === "cancelled" ? "cancelled" : "failed", jobId);
    } else report = started;
  } catch (error) {
    if (error instanceof OutcomeStopped) throw error;
    if (error instanceof PramaanError && error.code === "rate_limited")
      throw new OutcomeStopped("rate_limited", jobId, error.retryAfterMs);
    if (error instanceof PramaanError && error.code === "upstream_timeout")
      throw new OutcomeStopped("timeout", jobId);
    if (jobId) throw new OutcomeStopped("unknown", jobId);
    throw error;
  }
  if (report.steps.some(step => step.effect === "unknown")) throw new OutcomeStopped("unknown", jobId);
  if (report.status !== "done" || report.completeness === "partial")
    throw new OutcomeStopped(report.status === "cancelled" ? "cancelled" : "failed", jobId);
  return report;
}
