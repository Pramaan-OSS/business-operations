import { BankFeeds } from "@business-operations/banking/feeds";
import type { Database } from "./client";
import { importBankFeed } from "./queries/bank-feed-import";

export async function syncBankConnection(db: Database, context: { teamId: string; userId: string; connectionId: string }, feeds = new BankFeeds(), afterImport?: (result: Awaited<ReturnType<typeof importBankFeed>>) => Promise<unknown>) {
  const owner = `${context.teamId}:${context.userId}`;
  let from = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
  const to = new Date().toISOString().slice(0, 10);
  let snapshot: ReturnType<BankFeeds["snapshot"]> | undefined;
  return feeds.sync(owner, context.connectionId, async delta => {
    const earlier = [...delta.added, ...delta.modified].flatMap(row => row.date ? [row.date] : []).sort()[0];
    if (earlier && earlier < from) { from = earlier; snapshot = undefined; }
    snapshot ??= feeds.snapshot(owner, context.connectionId, from, to);
    const imported = await importBankFeed(db, context, await snapshot, delta.removed);
    if (afterImport) await afterImport(imported);
  });
}
