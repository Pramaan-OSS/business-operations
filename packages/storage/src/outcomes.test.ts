import { expect, test } from "bun:test";
import { FakePramaan } from "@business-operations/pramaan/fake";
import { mkdir, mkdtemp } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { reviewOutcome, approveOutcome, outcomeStatus } from "./outcomes";

test("review, approve, poll and cancel remain bound to the person and exact proposed input", async () => {
  const scratch = fileURLToPath(new URL("../../../.scratch/", import.meta.url));
  await mkdir(scratch, { recursive: true });
  const previous = process.env.STORAGE_ROOT;
  process.env.STORAGE_ROOT = await mkdtemp(`${scratch}approvals-`);
  const fake = new FakePramaan();
  fake.routeOutcomes({
    estimate: () => ({ ready: true, canRun: true, plan: "p1", steps: [] }),
    run: () => ({ id: "job1", status: "running" }),
  });
  fake.routeJobs({
    get: () => ({ id: "job1", status: "done", capability: "invoice.process", result: { outcome: "invoice.process", status: "done", steps: [], result: { invoiceCheck: "verified", booking: "not_checked" } } }),
    cancel: () => ({ id: "job1", status: "cancelled", capability: "invoice.process" }),
  });
  try {
    const input = { supplierRef: "vendor1", content: "aW52b2ljZQ==" };
    const review = await reviewOutcome("team1:user1", "invoice.process", input, { book: false }, fake);
    expect(fake.outcomeCalls.filter(call => call.verb === "start")).toHaveLength(0);
    await expect(approveOutcome("team1:user2", review.id, true, fake)).rejects.toThrow("not found");
    await expect(approveOutcome("team1:user1", review.id, false, fake)).rejects.toThrow("Approve");
    expect((await approveOutcome("team1:user1", review.id, true, fake)).status).toBe("running");
    await approveOutcome("team1:user1", review.id, true, fake);
    const starts = fake.outcomeCalls.filter(call => call.verb === "start");
    expect(starts).toHaveLength(1);
    expect(starts[0]).toMatchObject({ input, opts: { plan: "p1", options: { book: false }, idempotencyKey: review.id, retry: false } });
    expect((await outcomeStatus("team1:user1", review.id, false, fake)).result).toEqual({ invoiceCheck: "verified", booking: "not_checked" });

    const next = await reviewOutcome("team1:user1", "invoice.process", input, {}, fake);
    await approveOutcome("team1:user1", next.id, true, fake);
    expect((await outcomeStatus("team1:user1", next.id, true, fake)).status).toBe("cancelled");
    expect(fake.jobCalls.at(-1)).toEqual({ verb: "cancel", id: "job1" });

    fake.routeOutcomes({ run: () => ({ outcome: "invoice.process", status: "failed", steps: [{ effect: "unknown" }] }) });
    const uncertain = await reviewOutcome("team1:user1", "invoice.process", input, {}, fake);
    expect((await approveOutcome("team1:user1", uncertain.id, true, fake)).status).toBe("unknown");
    const count = fake.outcomeCalls.length;
    expect((await approveOutcome("team1:user1", uncertain.id, true, fake)).message).toContain("Check your connected account");
    expect(fake.outcomeCalls.length).toBe(count);
  } finally {
    if (previous === undefined) delete process.env.STORAGE_ROOT; else process.env.STORAGE_ROOT = previous;
  }
});
