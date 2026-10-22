import { requirePramaan, type Pramaan } from "@business-operations/pramaan";
import { createHash, randomUUID } from "node:crypto";
export type Mailbox = { ref: string; inbox: string; status: "active" | "past_due" };
type Message = { messageId: string; inbox: string; from: string; timestamp?: string; attachments?: { attachmentId: string; filename?: string; size: number; contentType?: string }[] };
export class Mailboxes {
  constructor(private readonly p: Pramaan = requirePramaan()) {}
  start(owner: string, returnUrl: string, approved: boolean) {
    if (!approved) throw new Error("Review and approve broad mailbox access before connecting.");
    return this.p.call("email.account.connect.start", { endUserRef: owner, returnUrl }, { idempotencyKey: randomUUID() }) as Promise<{ connectUrl: string; expiresAt: string; ref?: string }>;
  }
  async accounts(owner: string) {
    const rows: Mailbox[] = [];
    let cursor: string | undefined;
    for (let page = 0; page < 100; page++) {
      const result = await this.p.call("email.accounts.list", { endUserRef: owner, cursor, limit: 50 }) as { results: Mailbox[]; nextCursor?: string };
      rows.push(...result.results);
      if (!result.nextCursor) return rows;
      if (result.nextCursor === cursor) throw new Error("The mailbox list is incomplete.");
      cursor = result.nextCursor;
    }
    throw new Error("The mailbox list is incomplete.");
  }
  async disconnect(owner: string, inbox: string) {
    const account = (await this.accounts(owner)).find(row => row.inbox === inbox);
    if (!account) throw new Error("Mailbox not found.");
    const result = await this.p.call("email.account.disconnect", { ref: account.ref, endUserRef: owner, confirm: true }, { idempotencyKey: `disconnect-${createHash("sha256").update(`${owner}:${account.ref}`).digest("hex")}` }) as { disconnected: true };
    if (result.disconnected !== true) throw new Error("The mailbox disconnect could not be confirmed.");
    return result;
  }
  async attachments(owner: string, inbox: string, after?: string) {
    if (!(await this.accounts(owner)).some(row => row.inbox === inbox && row.status === "active")) throw new Error("Mailbox not found.");
    const attachments = [];
    let cursor: string | undefined;
    for (let page = 0; page < 100; page++) {
      const result = await this.p.call("email.messages.list", { inbox, limit: 50, cursor }) as { results: Message[]; nextCursor?: string };
      for (const summary of result.results) {
        if (summary.inbox !== inbox) throw new Error("The mailbox message could not be confirmed.");
        if (after && summary.timestamp && Date.parse(summary.timestamp) < Date.parse(after)) continue;
        const message = await this.p.call("email.message.get", { inbox, messageId: summary.messageId }) as Message;
        if (message.inbox !== inbox || message.messageId !== summary.messageId) throw new Error("The mailbox message could not be confirmed.");
        for (const file of message.attachments || []) {
          if (file.size > 10 * 1024 * 1024 || !(file.contentType === "application/pdf" || file.contentType?.startsWith("image/"))) continue;
          const attachment = await this.p.call("email.attachment.get", { inbox, messageId: message.messageId, attachmentId: file.attachmentId }) as { content: string; size: number; filename?: string; mimeType?: string };
          if (attachment.size > 10 * 1024 * 1024 || !/^[A-Za-z0-9+/]*={0,2}$/.test(attachment.content)) throw new Error("The attachment could not be confirmed.");
          const data = Buffer.from(attachment.content, "base64");
          if (data.length !== attachment.size || data.length !== file.size) throw new Error("The attachment was incomplete.");
          const id = createHash("sha256").update(`${owner}:${inbox}:${message.messageId}:${file.attachmentId}`).digest("hex");
          attachments.push({ id, referenceId: id, data, filename: attachment.filename || file.filename || "document", mimeType: attachment.mimeType || file.contentType!, size: attachment.size, senderEmail: message.from, website: undefined as string | undefined });
        }
      }
      if (!result.nextCursor) return attachments;
      if (result.nextCursor === cursor) throw new Error("The mailbox message list is incomplete.");
      cursor = result.nextCursor;
    }
    throw new Error("The mailbox message list is incomplete.");
  }
}
