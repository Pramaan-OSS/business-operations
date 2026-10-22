import { emailSender } from "@business-operations/pramaan";
import { createHash } from "node:crypto";
import { sendEmail } from "./send-email";
export async function sendFeedback(input: { email: string; name?: string; subject: string; message: string; url?: string }) {
  const from = emailSender();
  const to = process.env.FEEDBACK_EMAIL;
  if (!to) throw new Error("Support email is not set up yet. Set FEEDBACK_EMAIL.");
  const text = [`From: ${input.name || ""} <${input.email}>`, input.message, input.url || ""].filter(Boolean).join("\n\n");
  const idempotencyKey = createHash("sha256").update(JSON.stringify([input.email, input.subject, text, new Date().toISOString().slice(0, 10)])).digest("hex");
  await sendEmail({ from, to, replyTo: input.email, subject: input.subject, text, idempotencyKey });
  return { sent: true };
}
