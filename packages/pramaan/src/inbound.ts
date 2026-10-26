import { z } from "zod";
const cursor = z.string().max(1024).optional();
const ref = z.string().regex(/^ref_[a-z0-9]{26}$/);
const file = z.object({ fileId: z.string(), url: z.string().url(), expiresAt: z.string().datetime(), contentType: z.string(), sizeBytes: z.number().int().nonnegative() });
export const appReadInput = z.object({ endUserRef: z.string().regex(/^[A-Za-z0-9_.-]{1,128}$/), action: z.string().regex(/^[A-Z][A-Z0-9_]{1,127}$/), input: z.record(z.string().max(100), z.unknown()).refine(v => Buffer.byteLength(JSON.stringify(v)) <= 100000), since: cursor, limit: z.number().int().min(1).max(100).optional() }).strict();
export const whatsappReadInput = z.object({ connectionRef: z.string().min(1).max(256), since: cursor, limit: z.number().int().min(1).max(100).optional() }).strict();
export const appReadResult = z.object({ messages: z.array(z.object({ ref, sender: z.string().max(1000), text: z.string().max(10000), receivedAt: z.string().datetime() }).strict()).max(100), nextCursor: cursor }).strict();
export const whatsappReadResult = z.object({ messages: z.array(z.object({ ref, from: z.string().max(256), text: z.string().max(10000).optional(), receivedAt: z.string().datetime(), attachments: z.array(file).max(10).optional() }).strict()).max(100), nextCursor: cursor }).strict();
export type AppReadInput = z.infer<typeof appReadInput>;
export type AppReadResult = z.infer<typeof appReadResult>;
export type WhatsappReadInput = z.infer<typeof whatsappReadInput>;
export type WhatsappReadResult = z.infer<typeof whatsappReadResult>;
export function validateInbound(id: string, kind: "input" | "result", value: unknown) {
  const schema = id === "apps.action.read" ? (kind === "input" ? appReadInput : appReadResult) : id === "whatsapp.inbound-messages.list" ? (kind === "input" ? whatsappReadInput : whatsappReadResult) : undefined;
  if (schema && !schema.safeParse(value).success) throw new Error("Incoming messages could not be confirmed.");
}
