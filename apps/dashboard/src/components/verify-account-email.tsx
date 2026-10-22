"use client";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@business-operations/ui/button";
import { useTRPC } from "@/trpc/client";
export function VerifyAccountEmail() {
  const trpc = useTRPC();
  const [code, setCode] = useState("");
  const status = useQuery(trpc.user.emailVerification.queryOptions());
  const send = useMutation(trpc.user.requestEmailVerification.mutationOptions());
  const confirm = useMutation(trpc.user.confirmEmailVerification.mutationOptions({ onSuccess: () => { void status.refetch(); } }));
  return <section className="border p-4 space-y-3"><h2 className="text-xl">Verify your email</h2><p>Verification proves you can receive mail at your account address before accepting team invitations.</p>{status.data?.verified ? <p>Your email is verified.</p> : status.data?.configured ? <><Button disabled={send.isPending} onClick={() => send.mutate({ approved: true })}>Send me a verification code</Button>{send.isSuccess && <p>Check your email for a six-digit code. It expires in ten minutes.</p>}<form className="flex gap-3" onSubmit={event => { event.preventDefault(); confirm.mutate({ code }); }}><input aria-label="Verification code" className="border bg-background p-2" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={event => setCode(event.target.value)} /><Button disabled={confirm.isPending || code.length !== 6}>Verify email</Button></form></> : <p>Email verification is not available yet.</p>}{[status.error, send.error, confirm.error].filter(Boolean).map((error, index) => <p role="alert" key={index}>{error?.message}</p>)}</section>;
}
