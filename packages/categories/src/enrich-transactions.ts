import { runReadOnlyOutcome, type Pramaan, PramaanError } from "@business-operations/pramaan";

export type EnrichmentTransaction = {
  id: string;
  name: string;
  counterpartyName?: string | null;
  description?: string | null;
  amount: number;
  categorySlug: string | null;
  merchantName: string | null;
};

export type TransactionEnrichment = {
  transactionId: string;
  data: { merchantName?: string; categorySlug?: string };
};

// Keep within the outcome's 32-category limit; transfers and payouts are not expenses.
export const EXPENSE_CATEGORIES = [
  "software", "travel", "meals", "office-supplies", "equipment", "utilities",
  "rent", "internet-and-telephone", "facilities-expenses", "shipping", "marketing",
  "advertising", "website", "events", "promotional-materials", "professional-services-fees",
  "insurance", "contractors", "training", "employer-taxes", "benefits",
  "non-software-subscriptions", "activity", "banking-fees", "interest-expense",
  "processor-fees", "fees", "fixed-assets", "prepaid-expenses", "leases", "Other",
] as const;

/** Returns only checked suggestions. Failed or incomplete runs never count as enriched. */
export async function enrichTransactions(
  client: Pramaan,
  transactions: EnrichmentTransaction[],
  options: { signal?: AbortSignal; idempotencyKey: string; timeoutMs?: number },
): Promise<TransactionEnrichment[]> {
  if (transactions.length === 0) return [];
  if (transactions.length > 20) throw new Error("Enrichment accepts up to 20 transactions at a time.");
  const descriptors = transactions.map(tx => (tx.name || tx.counterpartyName || tx.description || "").trim());
  if (descriptors.some(value => value.length < 3 || value.length > 500))
    throw new PramaanError("invalid_request", "Transaction descriptions must contain 3 to 500 characters.");

  const run = await runReadOnlyOutcome(client, "expenses.categorize", { descriptors }, {
    ...options,
    options: { categories: [...EXPENSE_CATEGORIES] },
  });
  const result = run.result as { items?: { descriptor?: string; category?: string; merchantName?: string }[] } | undefined;
  if (!Array.isArray(result?.items) || result.items.length !== transactions.length ||
    result.items.some((item, index) => !item || item.descriptor !== descriptors[index]))
    throw new PramaanError("internal", "Could not match the enrichment results to the transactions.");

  return result.items.map((item, index) => {
    const tx = transactions[index]!;
    const data: TransactionEnrichment["data"] = {};
    if (item.merchantName?.trim()) data.merchantName = item.merchantName.trim();
    if (!tx.categorySlug && tx.amount <= 0 && item.category && EXPENSE_CATEGORIES.includes(item.category as typeof EXPENSE_CATEGORIES[number]))
      data.categorySlug = item.category === "Other" ? "other" : item.category;
    return { transactionId: tx.id, data };
  });
}
