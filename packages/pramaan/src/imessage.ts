import { PramaanError } from "./sdk/errors";
import type { HostedFile } from "./logo";
export type IncomingMessage = {
  rowRef: string;
  direction: "inbound" | "outbound";
  contact?: string;
  kind: "text" | "audio" | "attachments" | "sticker" | "location" | "opt-in" | "unknown";
  text?: string;
  channel?: "imessage" | "sms" | "rcs" | "whatsapp";
  createdAt?: string;
  files?: HostedFile[];
  groupRef?: string;
};
export type ImessageReceiveResult = { found: boolean; message?: IncomingMessage };
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const iso = (value: unknown, utc = false) => typeof value === "string" && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(value) && (!utc || value.endsWith("Z")) && Number.isFinite(Date.parse(value));
const address = (value: unknown) => typeof value === "string" && (/^\+[1-9]\d{1,14}$/.test(value) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));
const invalid = (input = false): never => { throw new PramaanError(input ? "invalid_request" : "internal", input ? "Check the receiving address, contact and wait time." : "The incoming message could not be confirmed."); };
export function validateImessageInput(value: unknown) {
  if (!object(value) || !address(value.sender) || !address(value.contact) || value.after !== undefined && !iso(value.after) || value.waitSeconds !== undefined && (typeof value.waitSeconds !== "number" || !Number.isInteger(value.waitSeconds) || value.waitSeconds < 1 || value.waitSeconds > 900)) invalid(true);
}
export function validateImessageResult(value: unknown): ImessageReceiveResult {
  if (!object(value) || typeof value.found !== "boolean" || value.found !== (value.message !== undefined)) return invalid();
  if (!value.found) return { found: false };
  const message = value.message;
  if (!object(message) || typeof message.rowRef !== "string" || !message.rowRef || (typeof message.direction !== "string" || !["inbound", "outbound"].includes(message.direction)) || (typeof message.kind !== "string" || !["text", "audio", "attachments", "sticker", "location", "opt-in", "unknown"].includes(message.kind))) return invalid();
  for (const key of ["contact", "text", "groupRef"]) if (message[key] !== undefined && typeof message[key] !== "string") return invalid();
  if (message.channel !== undefined && (typeof message.channel !== "string" || !["imessage", "sms", "rcs", "whatsapp"].includes(message.channel))) return invalid();
  if (message.createdAt !== undefined && !iso(message.createdAt, true)) return invalid();
  if (message.files !== undefined) {
    if (!Array.isArray(message.files) || message.files.length > 3) return invalid();
    for (const file of message.files) {
      if (!object(file) || typeof file.fileId !== "string" || !file.fileId || !iso(file.expiresAt) || typeof file.contentType !== "string" || !file.contentType || typeof file.sizeBytes !== "number" || !Number.isSafeInteger(file.sizeBytes) || file.sizeBytes < 0 || typeof file.url !== "string") return invalid();
      try { const url = new URL(file.url); if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return invalid(); } catch { return invalid(); }
    }
  }
  return { found: true, message: message as IncomingMessage };
}
