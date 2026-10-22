"use client";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@business-operations/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@business-operations/ui/dialog";
import { ExportTransactionsModal } from "@/components/modals/export-transactions-modal";
import { ConnectedAppActions } from "@/components/connected-app-actions";
import { useTransactionTab } from "@/hooks/use-transaction-tab";
import { useTransactionsStore } from "@/store/transactions";
import { useTRPC } from "@/trpc/client";
export function ExportBar() {
  const trpc = useTRPC();
  const { tab } = useTransactionTab();
  const { rowSelectionByTab } = useTransactionsStore();
  const ids = Object.keys(rowSelectionByTab.review).filter(id => rowSelectionByTab.review[id]);
  const [fileOpen, setFileOpen] = useState(false);
  const [accountingOpen, setAccountingOpen] = useState(false);
  const prepare = useMutation(trpc.accounting.export.mutationOptions({ onSuccess: () => setAccountingOpen(true) }));
  if (tab !== "review") return null;
  return <div className="flex flex-wrap items-center gap-3 border p-3"><span>{ids.length} selected</span><Button disabled={!ids.length} onClick={() => setFileOpen(true)}>Export to file</Button><Button variant="outline" disabled={!ids.length || prepare.isPending} onClick={() => prepare.mutate({ transactionIds: ids })}>Send to accounting</Button>{prepare.error && <p role="alert">{prepare.error.message}</p>}<ExportTransactionsModal isOpen={fileOpen} onOpenChange={setFileOpen} /><Dialog open={accountingOpen} onOpenChange={setAccountingOpen}><DialogContent className="max-h-[85vh] overflow-auto"><DialogHeader><DialogTitle>Review accounting export</DialogTitle></DialogHeader><ConnectedAppActions records={prepare.data?.transactions} /></DialogContent></Dialog></div>;
}
