"use client";
import type { Database } from "@business-operations/supabase/types";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
type Tables = Database["public"]["Tables"];
type TableName = keyof Tables;
/** Refresh app-owned data while visible; no hosted subscription or invented events. */
export function useRealtime<TN extends TableName>({ filter, table }: {
  channelName: string; events?: ("INSERT" | "UPDATE" | "DELETE")[]; table: TN; filter?: string;
  onEvent: (payload: RealtimePostgresChangesPayload<Tables[TN]["Row"]>) => void;
}) {
  const cache = useQueryClient();
  useEffect(() => {
    if (!filter) return;
    const family = ({ activities: "notifications", transaction_match_suggestions: "inbox", tracker_entries: "trackerEntries", bank_accounts: "bankAccounts" } as Record<string, string>)[table] || table;
    const refresh = () => {
      if (document.hidden) return;
      void cache.invalidateQueries({ refetchType: "active", predicate: query => {
        const route = query.queryKey[0];
        return Array.isArray(route) && route[0] === family && ["get", "getById", "list", "unreadCount", "getReviewCount"].includes(String(route[1]));
      } });
    };
    const timer = window.setInterval(refresh, 15000);
    window.addEventListener("focus", refresh);
    return () => { clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, [cache, filter, table]);
}
