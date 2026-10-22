import { randomUUID } from "node:crypto";
import { requirePramaan, toOutcomeRun, type OutcomeRun, type Pramaan, PramaanError, unavailableMessage } from "@business-operations/pramaan";
import { getObject, putObject } from "./index";

export type WorkflowId = "invoice.process" | "payments.reconcile" | "tax.quote" | "cashflow.report" | "revenue.summary" | "notify.send";
type Approval = {
  id: string; owner: string; outcome: WorkflowId; input: unknown;
  options: Record<string, unknown>; plan: string; expiresAt: number;
  status: "review" | "starting" | "running" | "done" | "cancelled" | "unknown";
  jobId?: string; result?: unknown; message?: string; retryAfterMs?: number;
};

function key(owner: string, id: string) {
  if (!/^[a-zA-Z0-9_:-]{1,256}$/.test(owner) || !/^[a-f0-9-]{36}$/.test(id)) throw new Error("Request not found.");
  return `${owner}/${id}.json`;
}
async function save(value: Approval) {
  await putObject({ bucket: "approvals", path: key(value.owner, value.id), data: JSON.stringify(value) });
}
async function load(owner: string, id: string): Promise<Approval> {
  const file = await getObject({ bucket: "approvals", path: key(owner, id) });
  if (!file) throw new Error("Request not found.");
  const value = JSON.parse(file.data.toString()) as Approval;
  if (value.owner !== owner || value.id !== id) throw new Error("Request not found.");
  return value;
}
function view(value: Approval) {
  return { id: value.id, status: value.status, expiresAt: value.expiresAt, result: value.result, message: value.message, retryAfterMs: value.retryAfterMs };
}
function recordError(value: Approval, error: unknown) {
  value.message = error instanceof PramaanError && error.code === "rate_limited"
    ? "Too many requests. Wait before checking again." : unavailableMessage(error);
  value.retryAfterMs = error instanceof PramaanError ? error.retryAfterMs : undefined;
}
function acceptReport(value: Approval, report: OutcomeRun) {
  if (report.steps.some(step => step.effect === "unknown") || report.completeness === "partial" || !["done", "cancelled"].includes(report.status)) {
    value.status = "unknown";
    value.message = "Could not confirm the result. Check your connected account before trying again.";
    return;
  }
  value.status = report.status === "cancelled" ? "cancelled" : "done";
  value.result = report.result;
}

/** Store the exact proposed input and plan. No action starts during review. */
export async function reviewOutcome(owner: string, outcome: WorkflowId, input: unknown,
  options: Record<string, unknown> = {}, client: Pramaan = requirePramaan()) {
  const estimate = await client.outcomes.estimate(outcome, input, { options, basis: { ground: "contract" } });
  if (!estimate.ready || !estimate.canRun) throw new Error("This feature is not available yet.");
  const value: Approval = { id: randomUUID(), owner, outcome, input, options, plan: estimate.plan,
    expiresAt: Date.now() + 14 * 60_000, status: "review" };
  await save(value);
  // No prices, provider metadata or raw step errors leave this module.
  return { ...view(value), requiresApproval: true };
}

/** A separate explicit approval acts only on the stored input, never replacement browser input. */
export async function approveOutcome(owner: string, id: string, approved: boolean, client: Pramaan = requirePramaan()) {
  const value = await load(owner, id);
  if (!approved) throw new Error("Approve this request before it can run.");
  if (value.status !== "review") return view(value);
  if (value.expiresAt <= Date.now()) throw new Error("This review expired. Review the request again.");
  value.status = "starting";
  await save(value);
  try {
    const started = await client.outcomes.start(value.outcome, value.input, { plan: value.plan, options: value.options,
      basis: { ground: "contract" }, idempotencyKey: value.id, retry: false });
    if ("id" in started) { value.jobId = started.id; value.status = "running"; }
    else acceptReport(value, started);
  } catch (error) {
    value.status = "unknown";
    recordError(value, error);
  }
  await save(value);
  return view(value);
}

/** Poll or cancel only a job accepted on this person's stored approval. */
export async function outcomeStatus(owner: string, id: string, cancel = false, client: Pramaan = requirePramaan()) {
  const value = await load(owner, id);
  if (value.status === "review" && cancel) { value.status = "cancelled"; await save(value); return view(value); }
  if (!value.jobId || value.status === "done" || value.status === "cancelled") return view(value);
  try {
    const job = cancel ? await client.jobs.cancel(value.jobId) : await client.jobs.get(value.jobId);
    if (job.result !== undefined) acceptReport(value, toOutcomeRun(job.result));
    else if (job.status === "cancelled") value.status = "cancelled";
    else if (job.status !== "running") {
      value.status = "unknown";
      value.message = "Could not confirm the result. Check your connected account before trying again.";
    }
  } catch (error) { recordError(value, error); }
  await save(value);
  return view(value);
}
