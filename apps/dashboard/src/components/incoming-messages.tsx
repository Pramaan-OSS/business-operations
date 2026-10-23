"use client";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Input } from "@business-operations/ui/input";
import { Button } from "@business-operations/ui/button";
import { useTRPC } from "@/trpc/client";
export function IncomingMessages() {
 const trpc = useTRPC(); const [number, setNumber] = useState(""); const [to, setTo] = useState(""); const [cursor, setCursor] = useState<string>();
 const messages = useQuery(trpc.workflows.incomingSms.queryOptions({ to, cursor }, { enabled: !!to, retry: false, refetchInterval: to ? 300000 : false }));
 return <section className="bo-card p-5 space-y-4"><h2>Incoming text messages</h2><p>Read messages sent to your own receiving number. Reads never send a reply.</p><label htmlFor="sms-receiving-number" className="block">Receiving phone number<Input id="sms-receiving-number" value={number} onChange={event => setNumber(event.target.value)} placeholder="+447700900000" /></label><Button disabled={!/^\+[1-9]\d{1,14}$/.test(number)} onClick={() => { setCursor(undefined); setTo(number); if (number === to) void messages.refetch(); }}>Read incoming messages</Button>{messages.error && <p role="status">{messages.error.message}</p>}{messages.data?.results.map((row, index) => <article key={index} className="border-b py-3"><p>{row.from} · {new Date(row.receivedAt).toLocaleString()}</p><p>{row.text || "This message has no text content."}</p></article>)}{messages.data?.results.length === 0 && <p>No messages in this page.</p>}{messages.data?.nextCursor && <Button variant="outline" onClick={() => setCursor(messages.data?.nextCursor)}>Read next page</Button>}</section>;
}

export function IncomingImessage() {
 const trpc = useTRPC();
 const [sender, setSender] = useState(""); const [contact, setContact] = useState("");
 const receive = useMutation(trpc.workflows.incomingImessage.mutationOptions({ retry: false }));
 return <section className="bo-card p-5 space-y-4"><h2>Wait for an incoming message</h2><p>Use your own rented receiving address. This waits up to 20 seconds and never sends anything.</p><label htmlFor="message-receiving-address" className="block">Your receiving phone number or email<Input id="message-receiving-address" value={sender} onChange={event => setSender(event.target.value)} /></label><label htmlFor="message-contact" className="block">Contact phone number or email<Input id="message-contact" value={contact} onChange={event => setContact(event.target.value)} /></label><Button disabled={!sender || !contact || receive.isPending} onClick={() => receive.mutate({ sender, contact, waitSeconds: 20 })}>{receive.isPending ? "Waiting…" : "Wait for a message"}</Button>{receive.error && <p role="status">{receive.error.message}</p>}{receive.data?.found === false && <p>No message arrived in this window.</p>}{receive.data?.message && <article><p>{receive.data.message.contact} · {receive.data.message.createdAt && new Date(receive.data.message.createdAt).toLocaleString()}</p><p className="whitespace-pre-wrap">{receive.data.message.text || "This message has no text content."}</p>{receive.data.message.files.map((file, index) => <a className="block underline" key={index} href={file.url} download>Download attachment {index + 1} ({file.contentType})</a>)}</article>}</section>;
}
