"use server";
import { z } from "zod";
import { authActionClient } from "@/actions/safe-action";
import { getTRPCClient } from "@/trpc/server";
export const manualSyncTransactionsAction = authActionClient.schema(z.object({ connectionId: z.string().uuid() }))
  .metadata({ name: "manual-sync-transactions" }).action(async ({ parsedInput }) => {
    const trpc = await getTRPCClient();
    const connections = await trpc.bankConnections.get.query();
    const connection = connections.find(row => row.id === parsedInput.connectionId);
    if (!connection?.referenceId) throw new Error("Bank connection not found.");
    await trpc.bankFeeds.sync.mutate({ id: connection.referenceId });
    return { completed: true };
  });
