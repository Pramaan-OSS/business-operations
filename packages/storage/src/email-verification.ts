import { createHash, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import { requirePramaan, emailSender, type Pramaan } from "@business-operations/pramaan";
import { getObject, putObject } from "./index";
type Proof = { email: string; digest?: string; salt?: string; expiresAt?: number; attempts?: number; sentAt?: number; verifiedAt?: number };
function key(userId: string) { if (!/^[a-f0-9-]{36}$/i.test(userId)) throw new Error("Account not found."); return `${userId}.json`; }
const normalize = (email: string) => email.trim().toLowerCase();
const digest = (salt: string, code: string) => createHash("sha256").update(`${salt}:${code}`).digest("hex");
async function load(userId: string): Promise<Proof | undefined> { const file = await getObject({ bucket: "email-proofs", path: key(userId) }); return file ? JSON.parse(file.data.toString()) : undefined; }
async function save(userId: string, value: Proof) { await putObject({ bucket: "email-proofs", path: key(userId), data: JSON.stringify(value) }); }
const locks = new Map<string, Promise<void>>();
async function exclusive<T>(id: string, action: () => Promise<T>): Promise<T> {
  key(id);
  const previous = locks.get(id) || Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>(resolve => { release = resolve; });
  locks.set(id, current);
  await previous;
  try { return await action(); }
  finally { release(); if (locks.get(id) === current) locks.delete(id); }
}
export async function hasVerifiedEmail(userId: string, email?: string) { const proof = await load(userId); return !!email && proof?.email === normalize(email) && !!proof.verifiedAt; }
export async function requestEmailVerification(userId: string, email: string, from: string, client: Pramaan = requirePramaan()) {
  return exclusive(userId, async () => {
  const previous = await load(userId);
  if (previous?.sentAt && Date.now() - previous.sentAt < 60000) throw new Error("Wait one minute before requesting another code.");
  const code = String(randomInt(100000, 1000000));
  const value: Proof = { email: normalize(email), salt: randomUUID(), expiresAt: Date.now() + 10 * 60000, attempts: 0, sentAt: Date.now() };
  value.digest = digest(value.salt!, code);
  await save(userId, value);
  await client.emailSend({ from: emailSender(from), replyTo: email, to: [email], subject: "Verify your email for Business Operations", text: `Your verification code is ${code}. It expires in ten minutes. If you did not request this, ignore this message.` }, { idempotencyKey: value.salt });
  return { sent: true };
  });
}
export async function confirmEmailVerification(userId: string, email: string, code: string) {
  return exclusive(userId, async () => {
  const value = await load(userId);
  if (!value || value.email !== normalize(email) || !value.digest || !value.salt || !value.expiresAt || value.expiresAt <= Date.now() || (value.attempts || 0) >= 5) throw new Error("This code has expired. Request a new code.");
  value.attempts = (value.attempts || 0) + 1;
  // Persist the attempt before comparing, so an interrupted request consumes an attempt.
  await save(userId, value);
  const actual = Buffer.from(digest(value.salt, code));
  const expected = Buffer.from(value.digest);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error("The code does not match.");
  await save(userId, { email: value.email, verifiedAt: Date.now(), sentAt: value.sentAt });
  return { verified: true };
  });
}
