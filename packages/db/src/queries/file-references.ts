import { and, eq, inArray, sql } from "drizzle-orm";
import type { Database } from "../client";
import { documents, inbox, transactionAttachments, transactionMatchSuggestions, transactions } from "../schema";

/** A physical file is shared by the vault, inbox and transaction attachments. */
export async function deleteFileReferences(db: Database, teamId: string, path: string[]) {
  const attachments = await db.delete(transactionAttachments)
    .where(and(eq(transactionAttachments.teamId, teamId), eq(transactionAttachments.path, path)))
    .returning({ transactionId: transactionAttachments.transactionId });
  const transactionIds = [...new Set(attachments.map(row => row.transactionId).filter((id): id is string => !!id))];
  if (transactionIds.length) await db.update(transactions).set({ taxRate: null, taxType: null })
    .where(and(eq(transactions.teamId, teamId), inArray(transactions.id, transactionIds),
      sql`NOT EXISTS (SELECT 1 FROM ${transactionAttachments} WHERE ${transactionAttachments.transactionId} = ${transactions.id} AND ${transactionAttachments.teamId} = ${teamId})`));
  const receipts = await db.update(inbox).set({ status: "deleted", transactionId: null, attachmentId: null })
    .where(and(eq(inbox.teamId, teamId), eq(inbox.filePath, path)))
    .returning({ id: inbox.id });
  if (receipts.length) await db.delete(transactionMatchSuggestions)
    .where(and(eq(transactionMatchSuggestions.teamId, teamId), inArray(transactionMatchSuggestions.inboxId, receipts.map(row => row.id))));
  await db.delete(documents).where(and(eq(documents.teamId, teamId), eq(documents.pathTokens, path)));
}
