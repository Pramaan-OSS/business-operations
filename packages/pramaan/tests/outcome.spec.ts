import { expect, test } from "bun:test";
import { FakePramaan } from "../src/fake";
import { createPramaan, OutcomeStopped, PramaanError, runReadOnlyOutcome, unavailableMessage } from "../src/index";

function fixture() {
  const fake = new FakePramaan();
  fake.routeOutcomes({
    estimate: () => ({ ready: true, canRun: true, plan: "plan1", steps: [] }),
    run: () => ({ id: "job1", status: "running", capability: "expenses.categorize" }),
  });
  fake.routeJobs({ get: () => ({ id: "job1", status: "done", capability: "expenses.categorize", result: { outcome: "expenses.categorize", status: "done", steps: [], result: { items: [] } } }) });
  return fake;
}

test("waits for the accepted job and returns only a complete report", async () => {
  const fake = fixture();
  expect((await runReadOnlyOutcome(fake, "expenses.categorize", { descriptors: ["EXAMPLE"] })).result).toEqual({ items: [] });
  expect(fake.jobCalls).toEqual([{ verb: "get", id: "job1" }]);
});

test("a cancelled request cancels the accepted job", async () => {
  const fake = fixture();
  const controller = new AbortController();
  fake.routeOutcomes({ run: () => { controller.abort(); return { id: "job1", status: "running" }; } });
  fake.routeJobs({ cancel: () => ({ id: "job1", status: "cancelled", capability: "expenses.categorize" }) });
  await expect(runReadOnlyOutcome(fake, "expenses.categorize", {}, { signal: controller.signal })).rejects.toThrow("cancelled");
  expect(fake.jobCalls).toEqual([{ verb: "cancel", id: "job1" }]);
});

test("no start when cancelled before the estimate", async () => {
  const fake = fixture();
  await expect(runReadOnlyOutcome(fake, "expenses.categorize", {}, { signal: AbortSignal.abort() })).rejects.toThrow("cancelled");
  expect(fake.outcomeCalls).toHaveLength(0);
});

test("429 at estimate or start preserves the wait and never starts again", async () => {
  for (const verb of ["estimate", "run"] as const) {
    const fake = fixture();
    fake.routeOutcomes({ [verb]: () => { throw new PramaanError("rate_limited", "private detail", { retryAfterMs: 2000 }); } });
    try { await runReadOnlyOutcome(fake, "expenses.categorize", {}); throw new Error("Expected failure"); }
    catch (error) {
      expect(error).toBeInstanceOf(OutcomeStopped);
      expect((error as OutcomeStopped).retryAfterMs).toBe(2000);
      expect(unavailableMessage(error)).toBe("Too many requests. Wait before trying again.");
    }
    expect(fake.outcomeCalls.filter(call => call.verb === "start")).toHaveLength(verb === "run" ? 1 : 0);
  }
});

test("timeout retains job id for checking the existing job", async () => {
  const fake = fixture();
  fake.routeJobs({ get: () => { throw new PramaanError("upstream_timeout", "private detail"); } });
  try { await runReadOnlyOutcome(fake, "expenses.categorize", {}); throw new Error("Expected failure"); }
  catch (error) {
    expect(error).toMatchObject({ reason: "timeout", jobId: "job1" });
    expect(unavailableMessage(error)).toContain("Check its status");
  }
  expect(fake.outcomeCalls.filter(call => call.verb === "start")).toHaveLength(1);
});

test("unknown effects, failed and partial reports never become success", async () => {
  for (const report of [
    { status: "done", steps: [{ effect: "unknown" }] },
    { status: "failed", steps: [] },
    { status: "done", completeness: "partial", steps: [] },
  ]) {
    const fake = fixture();
    fake.routeOutcomes({ run: () => report });
    await expect(runReadOnlyOutcome(fake, "expenses.categorize", {})).rejects.toThrow("Check its status");
  }
});

test("sending and money steps cannot use the automatic read path", async () => {
  for (const estimate of [
    { requiresApproval: true, steps: [] },
    { steps: [{ requiresApproval: false, effectClass: "external_irreversible" }] },
  ]) {
    const fake = fixture();
    fake.routeOutcomes({ estimate: () => ({ ready: true, canRun: true, ...estimate }) });
    await expect(runReadOnlyOutcome(fake, "expenses.categorize", {})).rejects.toThrow("approval");
    expect(fake.outcomeCalls.filter(call => call.verb === "start")).toHaveLength(0);
  }
});

test("the vendored client decodes a 202 and reads the finished outcome report", async () => {
  const requests: { path: string; body?: unknown; key: string | null }[] = [];
  const client = createPramaan({ apiKey: "fake", fetch: async (url, init) => {
    const path = new URL(String(url)).pathname;
    requests.push({ path, body: init?.body ? JSON.parse(String(init.body)) : undefined, key: new Headers(init?.headers).get("Idempotency-Key") });
    if (path.endsWith("/estimate")) return Response.json({ outcome: "expenses.categorize", ready: true, can_run: true, plan: "approved-plan", steps: [{ id: "classify", effect_class: "read_only" }] });
    if (path.endsWith("/expenses.categorize")) return Response.json({ job_id: "job_transport", status: "running" }, { status: 202 });
    if (path.endsWith("/job_transport")) return Response.json({ job_id: "job_transport", status: "done", result: { outcome: "expenses.categorize", status: "done", completeness: "complete", result: { items: [] }, steps: [] } });
    throw new Error("Unexpected fake request");
  } });
  const report = await runReadOnlyOutcome(client, "expenses.categorize", { descriptors: ["EXAMPLE"] }, { idempotencyKey: "batch1" });
  expect(report.result).toEqual({ items: [] });
  expect(requests.map(row => row.path)).toEqual(["/v1/outcomes/expenses.categorize/estimate", "/v1/outcomes/expenses.categorize", "/v1/jobs/job_transport"]);
  expect(requests[1]).toMatchObject({ key: "batch1", body: { input: { descriptors: ["EXAMPLE"] } } });
});
