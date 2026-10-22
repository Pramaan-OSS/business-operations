import "../setup";
import { expect, test } from "bun:test";
import { createCallerFactory } from "../../trpc/init";
import { invoicePaymentsRouter } from "../../trpc/routers/invoice-payments";
import { createTestContext } from "../helpers/test-context";
const caller = createCallerFactory(invoicePaymentsRouter)(createTestContext());
test("payment settings use only the platform key", async () => {
  expect(await caller.paymentStatus()).toEqual({ connected: true, status: "configured" });
});
test("refunds cannot use the removed direct integration", async () => {
  await expect(caller.refundPayment({ invoiceId: "00000000-0000-4000-8000-000000000001" })).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
});
