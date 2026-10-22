"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@business-operations/ui/button";
import { useTRPC } from "@/trpc/client";
import { useJobStatus } from "@/hooks/use-job-status";
import { ConnectMailbox } from "./connect-mailbox";
export function InboxConnectedAccounts() {
  const trpc = useTRPC();
  const cache = useQueryClient();
  const [jobId, setJobId] = useState<string>();
  const accounts = useQuery(trpc.inboxAccounts.get.queryOptions());
  const available = useQuery(trpc.inboxAccounts.available.queryOptions(undefined, { enabled: false }));
  const attach = useMutation(trpc.inboxAccounts.attach.mutationOptions({ onSuccess: () => { void cache.invalidateQueries({ queryKey: trpc.inboxAccounts.get.queryKey() }); } }));
  const remove = useMutation(trpc.inboxAccounts.delete.mutationOptions({ onSuccess: () => { void cache.invalidateQueries({ queryKey: trpc.inboxAccounts.get.queryKey() }); } }));
  const sync = useMutation(trpc.inboxAccounts.sync.mutationOptions({ onSuccess: result => setJobId(result.id) }));
  const job = useJobStatus({ jobId });
  return <div className="space-y-4"><ConnectMailbox /><Button variant="outline" onClick={() => void available.refetch()}>Check connected mailboxes</Button>{available.data?.filter(row => row.status === "active" && !accounts.data?.some(account => account.email === row.inbox)).map(row => <div key={row.ref}>{row.inbox} <Button disabled={attach.isPending} onClick={() => attach.mutate({ inbox: row.inbox })}>Import documents</Button></div>)}{accounts.data?.map(account => <div key={account.id} className="flex flex-wrap items-center gap-3 border p-3"><span>{account.email}</span><Button variant="outline" disabled={sync.isPending} onClick={() => sync.mutate({ id: account.id, manualSync: true })}>Read documents</Button><Button variant="outline" disabled={remove.isPending} onClick={() => { if (window.confirm("Disconnect this mailbox and end its rental? This also removes calendar and contacts access.")) remove.mutate({ id: account.id }); }}>Disconnect</Button></div>)}{jobId && <p role="status">Import: {job.status || "waiting"}{job.error ? " — could not finish" : ""}</p>}{[accounts.error, available.error, attach.error, remove.error, sync.error].filter(Boolean).map((error, i) => <p key={i} role="alert">{error?.message}</p>)}</div>;
}
