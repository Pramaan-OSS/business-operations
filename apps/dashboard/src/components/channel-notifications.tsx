"use client";
import { IncomingChannels } from "./incoming-channels";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@business-operations/ui/button";
import { useTRPC } from "@/trpc/client";
export function ChannelNotifications() {
  const trpc = useTRPC();
  const [recipient, setRecipient] = useState("");
  const [message, setMessage] = useState("");
  const [id, setId] = useState<string>();
  const review = useMutation(trpc.workflows.review.mutationOptions({ onSuccess: result => setId(result.id) }));
  const approve = useMutation(trpc.workflows.approve.mutationOptions());
  const cancel = useMutation(trpc.workflows.cancel.mutationOptions());
  const status = useQuery(trpc.workflows.status.queryOptions({ id: id || "00000000-0000-0000-0000-000000000000" }, { enabled: !!id, refetchInterval: query => query.state.data?.status === "running" ? Math.max(3000, query.state.data.retryAfterMs || 0) : false }));
  const state = status.data || review.data;
  return <main className="max-w-xl space-y-4"><h1 className="text-xl">Channel notifications</h1><p>Review each message before it is sent. Team chat reads use connected app actions where available; unsupported incoming channels are not available yet.</p><label className="block">Recipient email or phone<input className="block border bg-background p-2 w-full" value={recipient} disabled={!!id} onChange={e => setRecipient(e.target.value)} /></label><label className="block">Message<textarea className="block border bg-background p-2 w-full" value={message} maxLength={1600} disabled={!!id} onChange={e => setMessage(e.target.value)} /></label>{!id && <Button disabled={!recipient || !message || review.isPending} onClick={() => review.mutate({ outcome: "notify.send", input: { message, ...(recipient.startsWith("+") ? { phone: recipient, plainSms: true } : { email: recipient }) } })}>Review message</Button>}{id && <div className="border p-4 space-y-3"><p>To: {recipient}</p><p className="whitespace-pre-wrap">{message}</p><p>Status: {state?.status}</p>{state?.status === "review" && <Button disabled={approve.isPending} onClick={async () => { await approve.mutateAsync({ id, approved: true }); void status.refetch(); }}>Approve and send</Button>}{["review", "running"].includes(state?.status || "") && <Button variant="outline" disabled={cancel.isPending} onClick={async () => { await cancel.mutateAsync({ id }); void status.refetch(); }}>Cancel</Button>}<Button variant="outline" onClick={() => void status.refetch()}>Check status</Button><p>{state?.message}</p>{state?.result !== undefined && <pre className="whitespace-pre-wrap text-sm">{JSON.stringify(state.result, null, 2)}</pre>}</div>}{[review.error, approve.error, cancel.error, status.error].filter(Boolean).map((error, index) => <p role="alert" key={index}>{error?.message}</p>)}<IncomingChannels /></main>;
}
