import { describe, expect, test } from "bun:test";
import {
  Cap,
  idempotencyKey,
  NOT_AVAILABLE,
  unavailableMessage,
  isUnavailable,
  PramaanError,
  createPramaan,
  type Caps,
} from "../src/index";
import { FakePramaan } from "../src/fake";

const okOpts = () => ({ idempotencyKey: idempotencyKey() });

function fakeWithRoutes() {
  const fake = new FakePramaan({
    [Cap.emailSend]: () => ({ id: "em_1" }),
    [Cap.llmComplete]: () => ({ text: "ok", finishReason: "stop" }),
    [Cap.bankingInstitutionsSearch]: () => ({ institutions: [{ rowRef: `ref_${"0".repeat(26)}`, name: "Test Bank", countries: ["DE"] }] }),
    [Cap.bankingConnectionStart]: () => ({ ref: `ref_${"0".repeat(26)}`, connectUrl: "https://example.test/connect/link/test", expiresAt: "2099-01-01T00:00:00Z" }),
    [Cap.paymentsPaymentLinkCreate]: () => ({ ref: `ref_${"1".repeat(26)}`, paymentLinkId: "link_fixture", status: "created", paymentUrl: "https://example.test/pay" }),
    [Cap.paymentsCheckoutCreate]: () => ({ ref: "co_1", url: "https://example.test/checkout" }),
    [Cap.notifyMessageSend]: () => ({ ref: "nm_1" }),
    [Cap.whatsappMessageSend]: () => ({ ref: "wa_1" }),
    [Cap.imessageMessageSend]: () => ({ ref: "im_1" }),
    [Cap.chatMessagesList]: () => ({
      results: [
        { messageId: "m1", channelId: "chan1", text: "hello", senderName: "Ada" },
      ],
      nextCursor: null,
    }),
    [Cap.companiesLogoGet]: () => ({ file: { fileId: "file_01J00000000000000000000000", url: "https://api.pramaan.dev/files/file_01J00000000000000000000000", expiresAt: "2099-01-01T00:00:00Z", contentType: "image/png", sizeBytes: 8 }, placeholderAllowed: false }),
    [Cap.brandFromTransaction]: () => ({ name: "Test Merchant", domain: "testmerchant.test" }),
    [Cap.financeExchangeRateGet]: () => ({ rate: 1.25 }),
    [Cap.geoAddressSuggest]: () => ({ results: [{ address: "1 Main St" }] }),
    [Cap.documentParse]: () => ({ text: "INVOICE #1" }),
  });
  return fake;
}

describe("fake client", () => {
  test("generation requires messages and a sane maxTokens", async () => {
    const fake = fakeWithRoutes();
    await expect(
      fake.call(Cap.llmComplete, { prompt: "hi" } as unknown as Caps.LlmRequest)
    ).rejects.toThrow("messages instead of prompt");
    await expect(
      fake.call(Cap.llmComplete, { messages: [{ role: "user", content: "hi" }], maxTokens: 32 })
    ).rejects.toThrow("maxTokens");
    const result = await fake.call(Cap.llmComplete, {
      messages: [{ role: "user", content: "hi" }],
      maxTokens: 64,
    });
    expect((result as Caps.LlmResult).text).toBe("ok");
  });

  test("action capabilities require an Idempotency-Key", async () => {
    const fake = fakeWithRoutes();
    for (const id of [Cap.emailSend, Cap.paymentsPaymentLinkCreate, Cap.notifyMessageSend, Cap.whatsappMessageSend]) {
      await expect(fake.call(id, minimalInput(id))).rejects.toThrow("Idempotency-Key");
    }
    await expect(
      fake.call(Cap.paymentsPaymentLinkCreate, { amount: 100, currency: "EUR" }, okOpts())
    ).resolves.toBeTruthy();
    await expect(
      fake.call(Cap.paymentsPaymentLinkCreate, { amount: 10.5, currency: "EUR" }, okOpts())
    ).rejects.toThrow("whole-minor-unit");
  });

  test("banking connection start requires an owned return flow", async () => {
    const fake = fakeWithRoutes();
    await expect(fake.call(Cap.bankingConnectionStart, {}, okOpts())).rejects.toThrow("Check the bank connection request");
    const result = await fake.bankingConnectionStart({ endUserRef: "person1", returnUrl: "https://example.test/return", country: "DE" }, okOpts());
    expect(result.ref).toBe(`ref_${"0".repeat(26)}`);
  });

  test("routed calls answer through the fake only", async () => {
    const fake = fakeWithRoutes();
    const rows = (await fake.chatMessagesList({ channelId: "chan1" })) as {
      results: { messageId: string }[];
    };
    expect(rows.results[0].messageId).toBe("m1");
    expect(fake.callsTo(Cap.chatMessagesList).length).toBe(1);
    const banks = await fake.bankingInstitutionsSearch({ country: "DE" });
    expect(banks.institutions[0]!.name).toBe("Test Bank");
  });

  test("unrouted capabilities fail loudly instead of reaching the network", async () => {
    const fake = new FakePramaan();
    await expect(fake.call(Cap.storageObjectPut, {}, okOpts())).rejects.toThrow("no route");
  });

  test("outcomes and jobs route through the fake", async () => {
    const fake = fakeWithRoutes();
    fake.routeOutcomes({
      estimate: () => ({ currency: "USD", total: 0 }),
      run: (id) => ({ jobId: "job_x", outcomeId: id }),
    });
    fake.routeJobs({ get: () => ({ id: "job_x", status: "completed" }) as never });
    const estimate = await fake.outcomes.estimate("expenses.categorize", {}, {});
    expect(estimate).toBeTruthy();
    const run = await fake.outcomes.run("expenses.categorize", {}, {});
    expect((run as { jobId?: string }).jobId).toBe("job_x");
    const job = await fake.jobs.get("job_x");
    expect(job.status).toBe("completed");
    expect(fake.outcomeCalls.map((c) => c.verb)).toEqual(["estimate", "run"]);
  });
});

describe("unavailable surfaces", () => {
  test("plain message, no provider detail", () => {
    const error = new PramaanError("upstream_unavailable", "hidden detail", { status: 503 });
    expect(isUnavailable(error)).toBe(true);
    expect(unavailableMessage(error)).toBe(NOT_AVAILABLE);
    expect(unavailableMessage(new PramaanError("invalid_request", "bad", { status: 400 }))).not.toContain("bad");
  });

  test("a missing key says what to add", () => {
    const client = createPramaan({ apiKey: "k" });
    expect(client).toBeTruthy();
  });
});

function minimalInput(id: string): unknown {
  switch (id) {
    case Cap.emailSend:
      return { to: ["a@example.test"], subject: "s", html: "<p>x</p>", from: "no-reply@example.test" };
    case Cap.paymentsPaymentLinkCreate:
      return { amount: 100, currency: "EUR" };
    case Cap.notifyMessageSend:
      return { subscriber: { email: "a@example.test" }, message: "m" };
    case Cap.whatsappMessageSend:
      return { to: "+15550001", text: "m" };
    case Cap.imessageMessageSend:
      return { sender: "+15550000", recipient: "+15550001", text: "m" };
    default:
      return {};
  }
}
