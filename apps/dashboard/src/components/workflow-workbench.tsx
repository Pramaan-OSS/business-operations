"use client";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@business-operations/ui/button";
import { useTRPC } from "@/trpc/client";
import { ActionFields, type Schema } from "./connected-app-actions";
function initial(schema: Schema): unknown {
  if (schema.const !== undefined) return schema.const;
  if (schema.default !== undefined) return schema.default;
  if (schema.enum?.length === 1) return schema.enum[0];
  if (schema.type === "object") return Object.fromEntries(Object.entries(schema.properties || {}).map(([key, value]) => [key, initial(value)]).filter(([, value]) => value !== undefined));
  return undefined;
}
export function WorkflowWorkbench() {
  const trpc = useTRPC();
  const forms = useQuery(trpc.workflows.forms.queryOptions());
  const [selected, setSelected] = useState("");
  const [input, setInput] = useState<Record<string, unknown>>({});
  const [book, setBook] = useState(false);
  const [fileName, setFileName] = useState("");
  const [id, setId] = useState<string>();
  const [proposal, setProposal] = useState<Record<string, unknown>>({});
  const [checked, setChecked] = useState(false);
  const review = useMutation(trpc.workflows.review.mutationOptions({ onSuccess: (result, variables) => { setId(result.id); setProposal(variables.input); } }));
  const approve = useMutation(trpc.workflows.approve.mutationOptions({ onSuccess: () => { void status.refetch(); } }));
  const cancel = useMutation(trpc.workflows.cancel.mutationOptions({ onSuccess: () => { void status.refetch(); } }));
  const status = useQuery(trpc.workflows.status.queryOptions({ id: id || "00000000-0000-0000-0000-000000000000" }, { enabled: !!id, refetchInterval: query => query.state.data?.status === "running" ? Math.max(3000, query.state.data.retryAfterMs || 0) : false }));
  const form = forms.data?.find(value => value.id === selected);
  const result = status.data || review.data;
  return <main className="max-w-2xl space-y-4"><h1 className="text-xl">Review financial work</h1><p>Check the exact details before starting work on a connected account. Sending, booking and payment steps always need your approval.</p><label className="block">Task<select className="block border bg-background p-2 w-full" value={selected} disabled={!!id || review.isPending} onChange={event => { setSelected(event.target.value); const next = forms.data?.find(value => value.id === event.target.value); setInput(next ? initial(next.schema as Schema) as Record<string, unknown> : {}); setBook(false); setFileName(""); review.reset(); }}><option value="">Choose a task</option>{forms.data?.map(value => <option key={value.id} value={value.id}>{value.label}</option>)}</select></label>{form && <p>{form.note}</p>}{form && !form.available && <p>This feature is not available yet for this account.</p>}{form?.available && !id && <fieldset disabled={review.isPending} className="space-y-4"><ActionFields schema={form.schema as Schema} value={input} onChange={value => setInput(value as Record<string, unknown>)} label="Request details" />{form.id === "invoice.process" && <><label className="block">Invoice PDF<input className="block" type="file" accept="application/pdf" onChange={async event => { const file = event.target.files?.[0]; if (!file) return; if (file.size > 10 * 1024 * 1024) { event.target.setCustomValidity("Choose a PDF smaller than 10 MB."); event.target.reportValidity(); return; } event.target.setCustomValidity(""); const reader = new FileReader(); reader.onload = () => { setFileName(file.name); setInput(value => ({ ...value, content: String(reader.result).split(",")[1] })); }; reader.readAsDataURL(file); }} /></label><label className="flex gap-2"><input type="checkbox" checked={book} onChange={event => setBook(event.target.checked)} />Also book this invoice after the checks and my approval.</label></>}<Button onClick={() => review.mutate({ outcome: form.id, input, ...(form.id === "invoice.process" ? { book } : {}) })} disabled={review.isPending || form.id === "invoice.process" && !input.content}>Review request</Button></fieldset>}{id && <section className="border p-4 space-y-3"><h2>{form?.label}</h2>{fileName && <p>PDF: {fileName}</p>}<pre className="text-sm whitespace-pre-wrap">{JSON.stringify({ ...proposal, ...(proposal.content ? { content: "Selected PDF bytes" } : {}), ...(form?.id === "invoice.process" ? { book } : {}) }, null, 2)}</pre><p>Status: {result?.status}</p>{result?.status === "review" && <Button disabled={approve.isPending} onClick={() => approve.mutate({ id, approved: true })}>Approve this request</Button>}{["review", "running"].includes(result?.status || "") && <Button variant="outline" disabled={cancel.isPending} onClick={() => cancel.mutate({ id })}>Cancel request</Button>}<Button variant="outline" onClick={() => void status.refetch()}>Check status</Button>{result?.message && <p role="status">{result.message}</p>}{result?.result !== undefined && <pre className="text-sm whitespace-pre-wrap">{JSON.stringify(result.result, null, 2)}</pre>}{result?.status === "unknown" && <label className="flex gap-2"><input type="checkbox" checked={checked} onChange={event => setChecked(event.target.checked)} />I checked the connected account before creating another request.</label>}{["done", "cancelled", "unknown"].includes(result?.status || "") && <Button variant="outline" disabled={result?.status === "unknown" && !checked} onClick={() => { setId(undefined); setChecked(false); review.reset(); }}>New request</Button>}</section>}{[forms.error, review.error, approve.error, cancel.error, status.error].filter(Boolean).map((error, index) => <p role="alert" key={index}>{error?.message}</p>)}</main>;
}
