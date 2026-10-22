import { Icons } from "@business-operations/ui/icons";
export function InboxSourceIcon({ data }: { data: { inboxAccount?: { provider?: string; email?: string } | null; meta?: unknown } }) {
 if (!data.inboxAccount) return null;
 return <span title={data.inboxAccount.email || "Connected mailbox"} aria-label="Imported from a connected mailbox"><Icons.Email className="w-4 h-4" /></span>;
}
