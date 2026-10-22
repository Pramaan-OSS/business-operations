"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@business-operations/ui/use-toast";
import { manualSyncTransactionsAction } from "@/actions/transactions/manual-sync-transactions-action";

export function useReconnect({ connectionId }: { connectionId: string; provider: string | null }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [status, setStatus] = useState<"FAILED" | "SYNCING" | "COMPLETED" | null>(null);
  const action = useAction(manualSyncTransactionsAction, {
    onExecute: () => setStatus("SYNCING"),
    onSuccess: () => {
      setStatus("COMPLETED");
      void queryClient.invalidateQueries();
      router.refresh();
    },
    onError: ({ error }) => {
      setStatus("FAILED");
      toast({ variant: "error", title: error.serverError || "Bank sync could not finish. Check its status before trying again." });
    },
  });
  return {
    isSyncing: action.isPending,
    status,
    triggerReconnect: () => router.push("/banking"),
    triggerManualSync: () => action.execute({ connectionId }),
  };
}
