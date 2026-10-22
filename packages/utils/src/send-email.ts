import { randomUUID } from "node:crypto";
import { pramaanFromEnv, emailSender, type Pramaan } from "@business-operations/pramaan";
import { createLoggerWithContext } from "@business-operations/logger";

const logger = createLoggerWithContext("send-email");

/**
 * Email validation utilities for comma-separated email lists
 */

/**
 * Validates a single email address using a non-backtracking approach
 * to prevent ReDoS vulnerabilities
 */
export function isValidEmail(email: string): boolean {
  const trimmed = email.trim();

  // Length limits per RFC 5321
  if (trimmed.length === 0 || trimmed.length > 254) return false;

  const atIndex = trimmed.indexOf("@");

  // Must have exactly one @ with content on both sides
  if (atIndex < 1 || atIndex !== trimmed.lastIndexOf("@")) return false;

  const local = trimmed.slice(0, atIndex);
  const domain = trimmed.slice(atIndex + 1);

  // Local part validation per RFC 5321
  if (local.length === 0 || local.length > 64 || /\s/.test(local)) return false;

  // Domain validation: must have content, no spaces, and a valid TLD
  if (domain.length === 0 || domain.length > 253 || /\s/.test(domain))
    return false;

  // Domain validation: must have at least one dot with content on both sides
  const lastDotIndex = domain.lastIndexOf(".");
  if (lastDotIndex < 1 || lastDotIndex >= domain.length - 1) return false;

  return true;
}

/**
 * Parses a comma-separated email string into an array of trimmed emails
 */
export function parseEmailList(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
}

/**
 * Validates a comma-separated email string
 * Returns true if empty/null or if all emails are valid and unique (case-insensitive)
 */
export function isValidEmailList(value: string | null | undefined): boolean {
  if (!value) return true;
  const emails = parseEmailList(value);

  // Check for empty emails
  if (emails.some((email) => email.length === 0)) return false;

  // Check for duplicates (case-insensitive)
  const uniqueEmails = new Set(emails.map((e) => e.toLowerCase()));
  return uniqueEmails.size === emails.length;
}

// ── Outgoing email through the Pramaan client ───────────────────────────────

export type EmailAttachment = {
  /** File content, base64-encoded */
  content: string;
  filename: string;
  /** Optional MIME type; inferred from the filename when omitted */
  contentType?: string;
};

export type SendEmailInput = {
  idempotencyKey?: string;
  from?: string;
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
  bcc?: string | string[];
  attachments?: EmailAttachment[];
};

const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  csv: "text/csv",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  txt: "text/plain",
  json: "application/json",
};

function inferContentType(filename: string): string {
  const extension = filename.split(".").pop()?.toLowerCase() ?? "";
  return MIME_BY_EXTENSION[extension] ?? "application/octet-stream";
}

function toArray(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function base64ToBytes(base64: string): Uint8Array {
  return Uint8Array.from(Buffer.from(base64, "base64"));
}

/**
 * Uploads attachments and returns the file handles `email.send` expects.
 * The capability takes at most 10 files, 6 MB combined; oversize requests
 * are refused by the service and surface to the caller as an error.
 */
async function toAttachmentHandles(
  attachments: EmailAttachment[] | undefined,
  pramaan: Pramaan,
): Promise<Array<{ fileId: string; name: string }> | undefined> {
  if (!attachments?.length) return undefined;

  if (attachments.length > 10 || attachments.reduce((size, item) => size + Buffer.from(item.content, "base64").length, 0) > 6 * 1024 * 1024) throw new Error("Choose at most ten attachments, totalling no more than 6 MB.");

  const handles: Array<{ fileId: string; name: string }> = [];
  for (const attachment of attachments) {
    const handle = await pramaan.uploadFile({
      data: base64ToBytes(attachment.content),
      kind: "document",
      contentType:
        attachment.contentType ?? inferContentType(attachment.filename),
    });
    handles.push({ fileId: handle.fileId, name: attachment.filename });
  }

  return handles;
}

function getClient() {
  const pramaan = pramaanFromEnv();
  if (!pramaan) {
    throw new Error("Email is not available");
  }
  return pramaan;
}

/**
 * Sends one email through the Pramaan client.
 */
export async function sendEmail(input: SendEmailInput, pramaan: Pramaan = getClient()) {

  const attachments = await toAttachmentHandles(input.attachments, pramaan);

  const result = await pramaan.emailSend({
    from: emailSender(input.from),
    to: toArray(input.to),
    subject: input.subject,
    html: input.html,
    text: input.text,
    replyTo: input.replyTo,
    bcc: input.bcc ? toArray(input.bcc) : undefined,
    attachments,
  }, { idempotencyKey: input.idempotencyKey || randomUUID() });

  logger.debug("Email sent", { subject: input.subject });

  return result;
}

/**
 * Sends a batch of emails through the Pramaan client, one call per email.
 */
export async function sendEmails(inputs: SendEmailInput[]) {
  let sent = 0;
  const failures: Array<{ input: SendEmailInput; error: unknown }> = [];

  for (const input of inputs) {
    try {
      await sendEmail(input);
      sent++;
    } catch (error) {
      logger.error("Failed to send email", {
        subject: input.subject,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      failures.push({ input, error });
    }
  }

  return { sent, failures };
}
