import type { Database } from "@business-operations/db/client";
import { getInboxAccountById } from "@business-operations/db/queries";
import { Mailboxes } from "./mailboxes";
export class InboxConnector {
  constructor(private readonly provider: string, private readonly db: Database) {}
  async getAttachments(options: { id: string; teamId: string; maxResults?: number; lastAccessed?: string; fullSync?: boolean }) {
    const account = await getInboxAccountById(this.db, { id: options.id, teamId: options.teamId });
    if (!account || this.provider !== "pramaan") throw new Error("Reconnect this mailbox from the Inbox page.");
    return new Mailboxes().attachments(`team.${options.teamId}`, account.email, options.fullSync ? undefined : options.lastAccessed);
  }
}
