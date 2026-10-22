"use client";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@business-operations/ui/button";
import { useTRPC } from "@/trpc/client";

export type Schema = { const?: unknown; default?: unknown; format?: string; type?: string; properties?: Record<string, Schema>; title?: string; description?: string; enum?: string[]; required?: string[]; items?: Schema };
export function ActionFields({ schema, value, onChange, label }: { schema: Schema; value: unknown; onChange: (value: unknown) => void; label: string }) {
  if (schema.const !== undefined) return <label className="block text-sm">{label}<input className="block border bg-background p-2 w-full" readOnly value={String(schema.const)} /></label>;
  if (schema.type === "object" || schema.properties) return <fieldset className="space-y-3 border p-3"><legend>{label}</legend>{Object.entries(schema.properties || {}).map(([name, child]) => <ActionFields key={name} schema={child} label={`${name}${schema.required?.includes(name) ? " *" : ""}`} value={(value as Record<string, unknown> | undefined)?.[name]} onChange={next => onChange({ ...(value as object || {}), [name]: next })} />)}</fieldset>;
  if (schema.type === "array") {
    const values = Array.isArray(value) ? value : [];
    return <fieldset className="space-y-2 border p-3"><legend>{label}</legend>{values.map((item, index) => <div key={index}><ActionFields schema={schema.items || { type: "string" }} label={`Item ${index + 1}`} value={item} onChange={next => onChange(values.map((v, i) => i === index ? next : v))} /><Button type="button" variant="outline" onClick={() => onChange(values.filter((_, i) => i !== index))}>Remove item</Button></div>)}<Button type="button" variant="outline" onClick={() => onChange([...values, schema.items?.type === "object" ? {} : ""])}>Add item</Button></fieldset>;
  }
  return <label className="block space-y-1 text-sm"><span>{label}</span>{schema.description && <span className="block text-muted-foreground">{schema.description}</span>}{schema.enum ? <select className="block border bg-background p-2 w-full" value={String(value ?? "")} onChange={e => onChange(e.target.value)}><option value="">Choose</option>{schema.enum.map(option => <option key={option}>{option}</option>)}</select> : schema.type === "boolean" ? <input type="checkbox" checked={value === true} onChange={e => onChange(e.target.checked)} /> : <input className="block border bg-background p-2 w-full" type={schema.type === "number" || schema.type === "integer" ? "number" : "text"} step={schema.type === "integer" ? 1 : "any"} value={String(value ?? "")} onChange={e => onChange(schema.type === "number" || schema.type === "integer" ? Number(e.target.value) : e.target.value)} />}</label>;
}
export function ConnectedAppActions({ query = "accounting transactions invoices bills", records, reviewId }: { query?: string; records?: unknown; reviewId?: string }) {
  const trpc = useTRPC();
  const catalog = useQuery(trpc.connectors.search.queryOptions({ query }));
  const connections = useQuery(trpc.connectors.connections.queryOptions());
  const [selected, setSelected] = useState("");
  const [input, setInput] = useState<Record<string, unknown>>({});
  const [review, setReview] = useState<{ id: string; status: string; app: string; action: string; input: unknown }>();
  const [message, setMessage] = useState("");
  const existing = useQuery(trpc.connectors.status.queryOptions({ id: reviewId || "00000000-0000-0000-0000-000000000000" }, { enabled: !!reviewId }));
  useEffect(() => { if (existing.data) setReview(existing.data); }, [existing.data]);
  const reviewMutation = useMutation(trpc.connectors.review.mutationOptions({ onSuccess: value => { setReview(value); setMessage(""); }, onError: error => setMessage(error.message) }));
  const approve = useMutation(trpc.connectors.approve.mutationOptions({ onSuccess: value => { setReview(value); setMessage(value.message || `Result: ${value.status}`); }, onError: error => setMessage(error.message) }));
  const available = catalog.data?.filter(row => connections.data?.some(connection => connection.slug === row.app)) || [];
  const action = available.find(row => `${row.app}:${row.action}` === selected);
  return <div className="space-y-4">
    <p className="text-sm text-muted-foreground">Choose an action from your connected account. Review the details before approving a change or send.</p>
    {existing.error && <p role="alert">{existing.error.message}</p>}
    {catalog.error && <p role="alert">{catalog.error.message}</p>}
    {catalog.isSuccess && available.length === 0 && <p>No matching connected actions are available yet. Connect an account in Apps.</p>}
    <label className="block">Action<select className="block border bg-background p-2 w-full" value={selected} onChange={e => { setSelected(e.target.value); setInput({}); setReview(undefined); }}><option value="">Choose an action</option>{available.map(row => <option key={`${row.app}:${row.action}`} value={`${row.app}:${row.action}`}>{row.app}: {row.description || row.action}</option>)}</select></label>
    {records !== undefined && <details><summary>Selected financial records</summary><pre className="whitespace-pre-wrap text-xs max-h-64 overflow-auto">{JSON.stringify(records, null, 2)}</pre></details>}
    {action && !review && <><ActionFields schema={(action.inputSchema || { type: "object", properties: {} }) as Schema} value={input} onChange={value => setInput(value as Record<string, unknown>)} label="Action details" /><Button disabled={reviewMutation.isPending} onClick={() => reviewMutation.mutate({ app: action.app, action: action.action, input })}>Review request</Button></>}
    {review && <div className="space-y-3 border p-4"><p>{review.app}: {review.action}</p><pre className="whitespace-pre-wrap text-sm">{JSON.stringify(review.input, null, 2)}</pre><p>Status: {review.status}</p>{review.status === "review" && <><p>This can send information or change your connected account.</p><Button disabled={approve.isPending} onClick={() => approve.mutate({ id: review.id, approved: true })}>Approve this action</Button><Button variant="outline" onClick={() => setReview(undefined)}>Back</Button></>}</div>}
    {message && <p role="status">{message}</p>}
  </div>;
}
