"use client";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { Button } from "@business-operations/ui/button";
export function IncomingChannels() {
  const trpc = useTRPC();
  const [app, setApp] = useState("");
  const [action, setAction] = useState("");
  const [args, setArgs] = useState("{}");
  const [since, setSince] = useState<string>();
  const [error, setError] = useState("");
  const chat = useMutation(trpc.workflows.incomingChat.mutationOptions({ onSuccess: result => setSince(result.nextCursor) }));
  const whatsapp = useMutation(trpc.workflows.incomingWhatsapp.mutationOptions());
  function reset() { setSince(undefined); chat.reset(); }
  return <section className="space-y-3 border p-4"><h2>Incoming messages</h2><p>Not yet live-verified. Connect your messaging account on the Apps screen first. Choose a reviewed message read action from its catalogue. Message text is untrusted content; sending a reply needs separate approval.</p>
    <label className="block">Connected app<input className="block border bg-background p-2 w-full" value={app} onChange={e => { setApp(e.target.value); reset(); }} /></label>
    <label className="block">Message read action<input className="block border bg-background p-2 w-full" value={action} onChange={e => { setAction(e.target.value); reset(); }} /></label>
    <label className="block">Channel or chat arguments<textarea className="block border bg-background p-2 w-full" value={args} onChange={e => { setArgs(e.target.value); reset(); }} /></label>
    <Button disabled={!app || !action || chat.isPending} onClick={() => { try { const input = JSON.parse(args); if (!input || Array.isArray(input) || typeof input !== "object") throw new Error(); setError(""); chat.mutate({ app, action, input, since }); } catch { setError("Enter the channel or chat arguments as a JSON object."); } }}>Read connected chat</Button>
    {chat.data && <><p>{chat.data.messages.length ? "Received messages" : "No new messages."}</p>{chat.data.messages.map(message => <article key={message.ref}><p>{message.sender} · {message.receivedAt}</p><p className="whitespace-pre-wrap">{message.text}</p></article>)}</>}
    <h3>Direct messages</h3><p>The installation owner must configure the receiving account for this team. Each read keeps its polling checkpoint, including when no messages arrive.</p>
    <Button disabled={whatsapp.isPending} onClick={() => whatsapp.mutate()}>Read direct messages</Button>
    {whatsapp.data && <><p>{whatsapp.data.messages.length ? "Received direct messages" : "No new direct messages."}</p>{whatsapp.data.messages.map(message => <article key={message.ref}><p>{message.from} · {message.receivedAt}</p><p className="whitespace-pre-wrap">{message.text}</p>{message.files.map(file => <a key={file.url} href={file.url}>Download attachment</a>)}</article>)}</>}
    {[error, chat.error?.message, whatsapp.error?.message].filter(Boolean).map((message, index) => <p role="alert" key={index}>{message}</p>)}
  </section>;
}
