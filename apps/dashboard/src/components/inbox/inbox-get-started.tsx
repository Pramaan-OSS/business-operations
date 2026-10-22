"use client";
import { useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { revalidateInbox } from "@/actions/revalidate-action";
import { useInboxParams } from "@/hooks/use-inbox-params";
import { ConnectMailbox } from "./connect-mailbox";
import { UploadZone } from "./inbox-upload-zone";
export function InboxGetStarted() {
 const client = useQueryClient(); const trpc = useTRPC(); const { setParams } = useInboxParams();
 return <UploadZone onUploadComplete={async id => { await client.invalidateQueries({ queryKey: trpc.inbox.get.infiniteQueryKey() }); await revalidateInbox(); if (id) setParams({ inboxId: id }); }}><section className="mx-auto max-w-lg py-10 space-y-4"><h1>Add your receipts</h1><p>Drag files here or choose files to upload. Connect a mailbox to import attachments.</p><ConnectMailbox /><p>Incoming team chat depends on connected app read actions. Unsupported channels are not available yet.</p></section></UploadZone>;
}
