import { expect, test } from "bun:test";
import { mkdir, mkdtemp } from "node:fs/promises";
import path from "node:path";
import { FakePramaan } from "@business-operations/pramaan/fake";
import { hasVerifiedEmail, requestEmailVerification, confirmEmailVerification } from "./email-verification";
test("email proof is bound to one user and address, cannot be replayed and limits guesses", async () => {
  const scratch = path.resolve(__dirname, "../../../.scratch");
  await mkdir(scratch, { recursive: true });
  const previous = process.env.STORAGE_ROOT;
  process.env.STORAGE_ROOT = await mkdtemp(`${scratch}/email-proof-`);
  let code = "";
  const fake = new FakePramaan({ "email.send": input => { code = (input as { text: string }).text.match(/\b\d{6}\b/)![0]; return { status: "sent" }; } });
  const user = "00000000-0000-4000-8000-000000000001";
  try {
    expect(await hasVerifiedEmail(user, "person@example.test")).toBe(false);
    await requestEmailVerification(user, "person@example.test", "sender@example.test", fake);
    await expect(confirmEmailVerification(user, "other@example.test", code)).rejects.toThrow("expired");
    await expect(confirmEmailVerification("00000000-0000-4000-8000-000000000002", "person@example.test", code)).rejects.toThrow("expired");
    await confirmEmailVerification(user, "person@example.test", code);
    expect(await hasVerifiedEmail(user, "PERSON@example.test")).toBe(true);
    expect(await hasVerifiedEmail(user, "other@example.test")).toBe(false);
    await expect(confirmEmailVerification(user, "person@example.test", code)).rejects.toThrow("expired");
    const other = "00000000-0000-4000-8000-000000000003";
    await requestEmailVerification(other, "person@example.test", "sender@example.test", fake);
    await Promise.allSettled(Array.from({ length: 5 }, () => confirmEmailVerification(other, "person@example.test", "000000")));
    await expect(confirmEmailVerification(other, "person@example.test", code)).rejects.toThrow("expired");
  } finally { if (previous === undefined) delete process.env.STORAGE_ROOT; else process.env.STORAGE_ROOT = previous; }
});

test("email verification works without a configured sender and keeps the reply address", async () => {
 const previousRoot = process.env.STORAGE_ROOT, previousFrom = process.env.EMAIL_FROM;
 process.env.STORAGE_ROOT = await mkdtemp(path.resolve(__dirname, "../../../.scratch/email-sender-"));
 delete process.env.EMAIL_FROM;
 const fake = new FakePramaan({ "email.send": () => ({ ref: "sent-proof" }) });
 try {
  await requestEmailVerification("00000000-0000-4000-8000-000000000004", "owner@example.test", "", fake);
  expect(fake.calls[0]?.input).toMatchObject({ from: "Business Operations <noreply@updates.pramaan.one>", replyTo: "owner@example.test", to: ["owner@example.test"] });
  expect(fake.calls[0]?.opts?.idempotencyKey).toBeTruthy();
 } finally {
  if (previousRoot === undefined) delete process.env.STORAGE_ROOT; else process.env.STORAGE_ROOT = previousRoot;
  if (previousFrom === undefined) delete process.env.EMAIL_FROM; else process.env.EMAIL_FROM = previousFrom;
 }
});
