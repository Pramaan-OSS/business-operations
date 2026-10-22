import { queueBankImportJobs } from "@business-operations/job-client";
import { syncBankConnection } from "@business-operations/db/bank-sync";
import { bankConnections, usersOnTeam } from "@business-operations/db/schema";
import { and, eq } from "drizzle-orm";
import type { Job } from "bullmq";
import { getDb } from "../../utils/db";
import { BaseProcessor } from "../base";
export class SyncBankFeedProcessor extends BaseProcessor<{ teamId: string; userId: string; connectionId: string }> {
  async process(job: Job<{ teamId: string; userId: string; connectionId: string }>) {
    const context = job.data;
    const db = getDb();
    const connection = await db.query.bankConnections.findFirst({ where: and(eq(bankConnections.teamId, context.teamId), eq(bankConnections.referenceId, context.connectionId), eq(bankConnections.enrollmentId, context.userId)) });
    const member = await db.query.usersOnTeam.findFirst({ where: and(eq(usersOnTeam.teamId, context.teamId), eq(usersOnTeam.userId, context.userId)) });
    if (!connection || connection.status !== "connected" || !member) return { skipped: true };
    return syncBankConnection(db, context, undefined, imported => queueBankImportJobs(context.teamId, imported));
  }
}
