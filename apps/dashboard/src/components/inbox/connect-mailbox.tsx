"use client";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@business-operations/ui/button";
import { useTRPC } from "@/trpc/client";
export function ConnectMailbox() {
  const trpc = useTRPC();
  const [approved, setApproved] = useState(false);
  const connect = useMutation(trpc.inboxAccounts.connect.mutationOptions({ onSuccess: url => { window.location.href = url; } }));
  return <div className="space-y-3"><p>Manual document upload is ready. Mailbox import is optional and is not available yet on the live service.</p><p>Connecting grants broad mailbox access and starts a monthly mailbox rental after authorisation. Disconnecting also removes calendar and contacts access.</p><label className="flex gap-2"><input type="checkbox" checked={approved} onChange={e => setApproved(e.target.checked)} />I understand and want to connect my mailbox.</label><Button disabled={!approved || connect.isPending} onClick={() => connect.mutate({ approved: true })}>Connect mailbox</Button>{connect.error && <p role="alert">{connect.error.message}</p>}</div>;
}
