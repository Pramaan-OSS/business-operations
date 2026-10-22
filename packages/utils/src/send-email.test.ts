import { expect, test } from "bun:test";
import { FakePramaan } from "@business-operations/pramaan/fake";
import { sendEmail } from "./send-email";
test("email retains explicit send identity and refuses to silently drop attachments", async () => {
  const fake = new FakePramaan({ "email.send": () => ({ ref: "ref_sent" }) });
  await sendEmail({ from: "sender@example.test", to: "customer@example.test", subject: "Invoice", text: "Review invoice", idempotencyKey: "owned-job-send" }, fake);
  expect(fake.calls[0]?.opts?.idempotencyKey).toBe("owned-job-send");
  const attachment = { filename: "receipt.pdf", content: "YWJj" };
  await expect(sendEmail({ from: "sender@example.test", to: "customer@example.test", subject: "Invoice", attachments: Array.from({ length: 11 }, () => attachment) }, fake)).rejects.toThrow("at most ten");
  expect(fake.calls).toHaveLength(1);
});

test("key-only email uses the exact platform domain and preserves the owner's reply address", async () => {
  const previous = process.env.EMAIL_FROM;
  delete process.env.EMAIL_FROM;
  const fake = new FakePramaan({ "email.send": input => {
    const from = (input as { from: string }).from;
    if (from !== "Business Operations <noreply@updates.pramaan.one>") throw new Error("Connect an account for this capability first.");
    return { ref: "sent-notification" };
  } });
  try {
    await sendEmail({ to: "test-inbox@example.test", subject: "Notification", text: "A test notification", replyTo: "owner@example.test", idempotencyKey: "owned-notification" }, fake);
    expect(fake.calls[0]?.input).toMatchObject({ from: "Business Operations <noreply@updates.pramaan.one>", replyTo: "owner@example.test" });
    expect(fake.calls[0]?.opts?.idempotencyKey).toBe("owned-notification");
  } finally { if (previous === undefined) delete process.env.EMAIL_FROM; else process.env.EMAIL_FROM = previous; }
});

test("platform email omits replyTo when no owner reply address is supplied", async () => {
  const fake = new FakePramaan({ "email.send": input => {
    const body = JSON.parse(JSON.stringify(input));
    expect(typeof body.from).toBe("string");
    expect(body.from).toBe("Business Operations <noreply@updates.pramaan.one>");
    expect(body).not.toHaveProperty("replyTo");
    return { ref: "sent-notification-without-reply-address" };
  } });
  await sendEmail({ from: "Business Operations <noreply@updates.pramaan.one>", to: "notification@example.test", subject: "Notification", text: "A test notification", idempotencyKey: "owned-notification-without-reply-address" }, fake);
  expect(fake.callsTo("email.send")).toHaveLength(1);
});
