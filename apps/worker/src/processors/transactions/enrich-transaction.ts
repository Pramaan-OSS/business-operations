import { requirePramaan, unavailableMessage } from "@business-operations/pramaan";
import { enrichTransactions } from "@business-operations/categories/enrich-transactions";
import { getTransactionsForEnrichment, markTransactionsAsEnriched, updateTransactionEnrichments } from "@business-operations/db/queries";
import type { Job } from "bullmq";
import type { EnrichTransactionsPayload } from "../../schemas/transactions";
import { getDb } from "../../utils/db";
import { NonRetryableError } from "../../utils/error-classification";
import { BaseProcessor } from "../base";

export class EnrichTransactionProcessor extends BaseProcessor<EnrichTransactionsPayload> {
  async process(job: Job<EnrichTransactionsPayload>) {
    const { transactionIds, teamId } = job.data;
    const db = getDb();
    const rows = await getTransactionsForEnrichment(db, { transactionIds, teamId });
    let enrichedCount = 0;
    try {
      for (let offset = 0; offset < rows.length; offset += 20) {
        const updates = await enrichTransactions(requirePramaan(), rows.slice(offset, offset + 20), {
          idempotencyKey: `enrich:${job.id}:${offset}`,
        });
        if (updates.length) {
          const changes = updates.filter(row => row.data.merchantName || row.data.categorySlug);
          if (changes.length) await updateTransactionEnrichments(db, changes);
          await markTransactionsAsEnriched(db, updates.map(row => row.transactionId));
          enrichedCount += updates.length;
        }
      }
    } catch (error) {
      // The person must check an uncertain accepted job before starting another.
      throw new NonRetryableError(unavailableMessage(error), error);
    }
    return { enrichedCount, teamId };
  }
}
