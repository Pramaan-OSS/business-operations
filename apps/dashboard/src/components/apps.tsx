"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@business-operations/ui/button";
import { useTRPC } from "@/trpc/client";
import { ConnectedAppActions } from "./connected-app-actions";
export function Apps() {
  const trpc = useTRPC();
  const cache = useQueryClient();
  const [query, setQuery] = useState("business accounting invoices payments messages");
  const [approved, setApproved] = useState(false);
  const catalog = useQuery(trpc.connectors.search.queryOptions({ query }));
  const connections = useQuery(trpc.connectors.connections.queryOptions());
  const connect = useMutation(trpc.connectors.authorize.mutationOptions({ onSuccess: result => { window.location.href = result.redirectUrl; } }));
  const disconnect = useMutation(trpc.connectors.disconnect.mutationOptions({ onSuccess: () => { void cache.invalidateQueries({ queryKey: trpc.connectors.connections.queryKey() }); } }));
  const apps = [...new Set(catalog.data?.map(row => row.app) || [])];
  return <div className="space-y-6">
    <label className="block">Find an app or action<input className="block border bg-background p-2 w-full" value={query} onChange={e => setQuery(e.target.value || "business")} /></label>
    <p>Connecting can grant broad access to your account. Review the permissions before authorising. Connected data is read when you request it; automatic app triggers are not available yet.</p>
    <label className="flex gap-2"><input type="checkbox" checked={approved} onChange={e => setApproved(e.target.checked)} />I understand and want to connect an account.</label>
    {[catalog.error, connections.error, connect.error, disconnect.error].filter(Boolean).map((error, i) => <p role="alert" key={i}>{error?.message}</p>)}
    {catalog.isLoading && <p>Loading available apps…</p>}
    {catalog.isSuccess && !apps.length && <p>This feature is not available yet.</p>}
    <div className="grid gap-3 sm:grid-cols-2">{apps.map(app => { const connected = connections.data?.some(row => row.slug === app); return <article key={app} className="border p-4 space-y-3"><h2>{app}</h2><p className="text-sm text-muted-foreground">{catalog.data?.find(row => row.app === app)?.description}</p>{connected ? <Button variant="outline" disabled={disconnect.isPending} onClick={() => { if (window.confirm("Disconnect this account?")) disconnect.mutate({ connectedAccountId: app }); }}>Disconnect</Button> : <Button disabled={!approved || connect.isPending} onClick={() => connect.mutate({ toolkit: app, approved: true })}>Connect account</Button>}</article>; })}</div>
    <ConnectedAppActions query={query} />
  </div>;
}
