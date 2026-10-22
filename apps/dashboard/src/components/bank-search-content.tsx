"use client";
import { useEffect, useState, type ReactNode } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@business-operations/ui/button";
import { Input } from "@business-operations/ui/input";
import { useTRPC } from "@/trpc/client";

type BankSearchContentProps = { enabled: boolean; redirectPath?: string; listHeight?: string;
  defaultCountryCode?: string; fadeGradientClass?: string;
  emptyState?: ReactNode | ((context: { query: string; countryCode: string }) => ReactNode) };
function money(amount: number, currency: string) {
  const formatter = new Intl.NumberFormat(undefined, { style: "currency", currency });
  return formatter.format(amount / 10 ** (formatter.resolvedOptions().maximumFractionDigits ?? 2));
}
export function BankSearchContent({ enabled, defaultCountryCode, listHeight = "h-[430px]" }: BankSearchContentProps) {
  const trpc = useTRPC();
  const [country, setCountry] = useState(defaultCountryCode || "GB");
  const [query, setQuery] = useState("");
  const [approved, setApproved] = useState(false);
  const [connection, setConnection] = useState("");
  useEffect(() => { setConnection(new URLSearchParams(window.location.search).get("bankConnection") || ""); }, []);
  const saved = useQuery(trpc.bankFeeds.connections.queryOptions());
  const [revokeApproved, setRevokeApproved] = useState(false);
  const revoke = useMutation(trpc.bankFeeds.revoke.mutationOptions({ onSuccess: () => { setConnection(""); setRevokeApproved(false); void saved.refetch(); } }));
  const banks = useQuery(trpc.bankFeeds.institutions.queryOptions({ country, query: query || undefined }, { enabled: enabled && /^[A-Z]{2}$/.test(country) && !connection, retry: false }));
  const status = useQuery(trpc.bankFeeds.status.queryOptions({ id: connection }, { enabled: enabled && !!connection, retry: false, refetchInterval: query => query.state.data?.status === "pending" ? 5000 : false }));
  const accounts = useQuery(trpc.bankFeeds.accounts.queryOptions({ id: connection }, { enabled: status.data?.status === "connected", retry: false }));
  const transactions = useQuery(trpc.bankFeeds.transactions.queryOptions({ id: connection }, { enabled: status.data?.status === "connected", retry: false }));
  const start = useMutation(trpc.bankFeeds.start.mutationOptions({ onSuccess: result => { window.location.assign(result.connectUrl); } }));
  const sync = useMutation(trpc.bankFeeds.sync.mutationOptions({ onSuccess: () => transactions.refetch() }));
  const error = revoke.error || saved.error || banks.error || start.error || status.error || accounts.error || sync.error;
  return <div className={`space-y-4 overflow-auto ${listHeight}`}>
    {connection ? <>
      <label className="flex gap-2"><input type="checkbox" checked={revokeApproved} onChange={event => setRevokeApproved(event.target.checked)} />I approve ending this connection and its account rental.</label>
      <Button variant="outline" disabled={!revokeApproved || revoke.isPending} onClick={() => revoke.mutate({ id: connection, approved: true })}>Revoke bank access</Button>
      <p>Connection: {status.data?.status || "Checking…"}</p>
      {accounts.data?.map(account => <p key={account.rowRef}>{account.name || "Account"} {account.maskedAccountNumber} {account.currency}</p>)}
      <Button disabled={status.data?.status !== "connected" || sync.isPending} onClick={() => sync.mutate({ id: connection })}>Read transactions</Button>
      {transactions.data?.map((row, index) => <div key={row.rowRef || index} className="border-b py-2">
        <span>{row.date || "Date not supplied"} {row.description || row.counterparty?.name || "Transaction"}</span>
        <span className="ml-2">{money(row.amount, row.currency)}</span>
      </div>)}
      {sync.data && <p>Next check: {new Date(sync.data.nextSyncAt).toLocaleString()}</p>}
    </> : <>
      {saved.data?.map((row, index) => <Button key={row.id} variant="outline" onClick={() => setConnection(row.id)}>Resume bank connection {index + 1}</Button>)}
      <label className="block">Bank country code<Input value={country} maxLength={2} onChange={event => setCountry(event.target.value.toUpperCase())} /></label>
      <label className="block">Find your bank<Input value={query} maxLength={200} onChange={event => setQuery(event.target.value)} /></label>
      <p className="text-sm">Connecting gives access to the accounts, balances and transactions you authorise. A monthly rental for each account starts after you authorise the connection.</p>
      <label className="flex gap-2 text-sm"><input type="checkbox" checked={approved} onChange={event => setApproved(event.target.checked)} />I approve this access and understand when the monthly rental starts.</label>
      {banks.data?.institutions.map(bank => <div key={bank.rowRef || bank.name} className="flex items-center justify-between border-b py-2">
        <span>{bank.name}</span><Button disabled={!approved || !bank.rowRef || start.isPending} onClick={() => start.mutate({ country, institutionRef: bank.rowRef, approved: true })}>Connect</Button>
      </div>)}
      {banks.isLoading && <p>Looking for banks…</p>}
      {banks.data?.institutions.length === 0 && <p>No banks found for this search.</p>}
    </>}
    {error && <p role="status">{error.message}</p>}
  </div>;
}
