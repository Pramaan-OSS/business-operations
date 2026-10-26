import { actionKeyRequired, ACTION_KEY_REQUIRED } from "./action-keys";
import { randomUUID } from "node:crypto";
// Fixed sample token for the offline transport; no browser-specific encoding is required.
export const demoManagedToken = "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiJkZW1vLW1hbmFnZWQtcGVyc29uIiwiZW1haWwiOiJkZW1vLW1hbmFnZWRAZXhhbXBsZS50ZXN0IiwiZW1haWxWZXJpZmllZCI6dHJ1ZSwibmFtZSI6IkRlbW8gYWNjb3VudCJ9.offline-fixture";
const appConnections = new Map<string, Set<string>>();
function connectedApps(owner: string) {
  if (!appConnections.has(owner)) appConnections.set(owner, new Set(["demo_accounting", "slack", "microsoft_teams"]));
  return appConnections.get(owner)!;
}
const paymentLinks = new Map<string, Record<string, unknown>>();
const jobs = new Map<string, Record<string, unknown>>();
const ref = (digit: string) => `ref_${digit.repeat(26)}`;
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aZk0AAAAASUVORK5CYII=", "base64");
function reply(value: unknown, status = 200) { return Response.json(value, { status }); }
function job(capability: string, result: unknown) {
  const id = `job_${randomUUID()}`;
  jobs.set(id, { job_id: id, capability, status: "done", result });
  return reply({ job_id: id, capability, status: "running" }, 202);
}
function transaction() { return { rowRef: ref("2"), amount: -1299, currency: "GBP", direction: "debit", status: "booked", date: new Date().toISOString().slice(0, 10), description: "Demo office supplies" }; }
/** Offline fixture transport. It never delegates to fetch, including unknown routes. */
export async function demoFetch(rawUrl: string, init: RequestInit): Promise<Response> {
  const url = new URL(rawUrl);
  const body = init.body ? JSON.parse(String(init.body)) : {};
  const path = decodeURIComponent(url.pathname);
  if (path.startsWith("/files/") && (init.method || "GET") === "GET") return new Response(png, { headers: { "Content-Type": "image/png" } });
  if (path.startsWith("/v1/jobs/")) {
    const id = path.split("/")[3]!;
    const stored = jobs.get(id);
    if (!stored) return reply({ error: { code: "not_found", message: "Demo job not found." } }, 404);
    if (path.endsWith("/cancel")) { stored.status = "cancelled"; delete stored.result; }
    return reply(stored);
  }
  if (path.endsWith("/estimate")) return reply({ outcome: path.split("/")[3], ready: true, can_run: true, plan: "demo-plan", steps: [] });
  if (path.startsWith("/v1/outcomes/")) {
    const outcome = path.split("/")[3]!;
    if ((init.method || "GET") === "GET") return reply({ id: outcome, available: true, input_schema: { type: "object", properties: { app: { type: "string", enum: ["demo_accounting"] }, taxApp: { type: "string", enum: ["demo_accounting"] } } }, options_schema: {}, result_schema: {}, steps: [] });
    const input = body.input || {};
    let result: unknown = { demo: true };
    if (outcome === "expenses.categorize") result = { items: (input.descriptors || []).map((descriptor: string) => ({ descriptor, merchantName: "Demo merchant", category: "office-supplies" })), unmatched: [] };
    if (outcome === "document.classify") result = { kind: "receipt", language: "en", confidence: 1 };
    if (outcome === "notify.send") result = { channel: input.phone ? "sms" : "email", to: input.phone || input.email, sent: { status: "sent" }, demo: true };
    return job(outcome, { outcome, status: "done", completeness: "complete", plan: "demo-plan", steps: [], result });
  }
  const id = path.replace("/v1/capabilities/", "");
  if ((init.method || "GET") === "POST" && actionKeyRequired(id) && !new Headers(init.headers).get("Idempotency-Key")?.trim()) return reply({ error: { code: "invalid_request", message: ACTION_KEY_REQUIRED } }, 400);
  switch (id) {
    case "db.postgres.provision": return reply({ error: { code: "upstream_unavailable", message: "Managed database is not available yet." } }, 502);
    case "auth.backend.provision": return process.env.PRAMAAN_FAKE_AUTH_UNAVAILABLE === "1" ? reply({ error: { code: "upstream_unavailable", message: "Managed sign-in is not available yet." } }, 502) : reply({ status: "ready", authUrl: "https://managed-signin.example.test/auth", jwksUrl: "https://managed-signin.example.test/auth/jwks" });
    case "auth.backend.domains.set": return reply({ allowedDomains: (body.domains || []).map((domain: string) => ({ domain })) });
    case "auth.user.get": return reply({ userId: body.userId, email: "demo-managed@example.test", emailVerified: true, name: "Demo account" });
    case "auth.user.update": return reply({ userId: body.userId, email: "demo-managed@example.test", emailVerified: true, name: body.name });
    case "auth.user.delete": return body.confirm === true ? reply({ deleted: true }) : reply({ error: { code: "invalid_input", message: "Confirmation is required." } }, 400);
    case "auth.token.verify": return reply(body.token === demoManagedToken ? { valid: true, userId: "demo-managed-person", sessionId: "demo-session", orgId: null, expiresAt: "2099-01-01T00:00:00Z" } : { valid: false });
    case "imessage.message.receive": return job(id, { found: true, message: { rowRef: ref("8"), direction: "inbound", contact: body.contact, kind: "text", text: "Demo incoming message", channel: "imessage", createdAt: new Date().toISOString() } });
    case "apps.action.read":
    case "whatsapp.inbound-messages.list": {
      if (process.env.PRAMAAN_FAKE_INBOUND === "unavailable") return reply({ error: { code: "not_found", message: "Not available yet." } }, 404);
      if (process.env.PRAMAAN_FAKE_INBOUND === "refused") return reply({ error: { code: "invalid_request", message: "This message read is refused." } }, 400);
      if (id === "apps.action.read" && !["SLACK_FETCH_CONVERSATION_HISTORY", "MICROSOFT_TEAMS_LIST_CHAT_MESSAGES"].includes(body.action)) return reply({ error: { code: "invalid_request", message: "Choose a reviewed message read action." } }, 400);
      return reply({ messages: body.since ? [] : [{ ref: ref("7"), ...(id === "apps.action.read" ? { sender: "Demo sender" } : { from: "+447700900001" }), text: "Demo incoming message", receivedAt: "2026-10-26T12:00:00Z" }], nextCursor: "demo-inbound-checkpoint" });
    }
    case "sms.inbound-messages.list": return reply({ results: [{ ref: ref("7"), from: "+447700900001", to: body.to || "+447700900000", contentType: "text", body: "Demo incoming message", receivedAt: new Date().toISOString() }] });
    case "banking.institutions.search": return reply({ institutions: [{ rowRef: ref("0"), name: "Demo bank", countries: [body.country || "GB"] }] });
    case "banking.connection.start": return reply({ ref: ref("0"), connectUrl: "https://api.pramaan.dev/connect/link/demo", expiresAt: "2099-01-01T00:00:00Z" });
    case "banking.connection.status": return reply({ status: "connected" });
    case "banking.accounts.list": return reply({ accounts: [{ rowRef: ref("1"), name: "Demo business account", currency: "GBP", type: "checking" }], truncated: false });
    case "banking.account.balances.get": return reply({ balances: [{ type: "current", amount: 250000, currency: "GBP" }] });
    case "banking.transactions.list": return reply({ transactions: [transaction()], truncated: false });
    case "banking.transactions.sync": return reply({ added: body.cursor ? [] : [transaction()], modified: [], removed: [], nextCursor: "demo-cursor", hasMore: false });
    case "finance.consent.revoke": return reply({ status: "revoked" });
    case "apps.catalog.search": {
      const results = [
        { app: "slack", action: "SLACK_FETCH_CONVERSATION_HISTORY", readOnly: true, description: "Read connected channel messages", inputSchema: { type: "object", properties: { channel: { type: "string" } }, required: ["channel"] } },
        { app: "microsoft_teams", action: "MICROSOFT_TEAMS_LIST_CHAT_MESSAGES", readOnly: true, description: "Read connected chat messages", inputSchema: { type: "object", properties: { chat_id: { type: "string" } }, required: ["chat_id"] } },
        { app: "demo_accounting", action: "DEMO_LIST_ACCOUNTS", readOnly: true, description: "Read demo chart of accounts", inputSchema: { type: "object", properties: {} } },
        { app: "demo_accounting", action: "DEMO_CREATE_INVOICE", description: "Create a demo invoice", inputSchema: { type: "object", properties: { customer: { type: "string" }, amount: { type: "number" }, currency: { type: "string" } }, required: ["customer", "amount", "currency"] } },
      ];
      return reply({ results: results.filter(row => !body.app || row.app === body.app) });
    }
    case "apps.connections.list": return reply({ results: [...connectedApps(body.endUserRef)].map(app => ({ app, status: "active", access: "read-write" })) });
    case "apps.connection.start": connectedApps(body.endUserRef).add(body.app); return reply({ connectUrl: body.redirectUrl });
    case "apps.connection.revoke": connectedApps(body.endUserRef).delete(body.app); return reply({ revoked: 1 });
    case "apps.action.execute": return reply({ status: "succeeded", output: { demo: true, action: body.action, input: body.input } });
    case "companies.logo.get": {
      const fileId = "file_01J00000000000000000000000";
      return job(id, { file: { fileId, url: `${url.origin}/files/${fileId}`, expiresAt: "2099-01-01T00:00:00Z", contentType: "image/png", sizeBytes: png.length }, placeholderAllowed: false });
    }
    case "document.extract": {
      const properties = body.schema?.properties || {};
      if (properties.document_type && properties.amount) return job(id, { data: { name: "Demo office supplies", date: new Date().toISOString().slice(0, 10), amount: 12.99, currency: "GBP", website: null, description: "Offline sample receipt", tax_amount: null, tax_rate: null, tax_type: null, invoice_number: null, document_type: "receipt" }, truncated: false });
      if (properties.title && properties.tags) return job(id, { data: { title: "Demo office supplies receipt", summary: "Offline sample document", tags: ["Receipt"], date: new Date().toISOString().slice(0, 10), language: "english", ...(properties.content ? { content: "Offline sample document" } : {}) }, truncated: false });
      return reply({ error: { code: "upstream_unavailable", message: "This demonstration document format is not available yet." } }, 502);
    }
    case "document.parse": return job(id, { text: "Offline sample document: Demo office supplies, GBP 12.99", truncated: false });
    case "text.embed": return reply({ model: "demo-embedding", space: "demo-space", dimensions: 1024, embeddings: body.input.map((text: string) => Array.from({ length: 1024 }, (_, index) => index === 0 ? text.length / 1000 : 1 / 1024)) });
    case "llm.chat": case "llm.complete": {
      const prompt = body.messages?.find((message: { content?: unknown }) => typeof message.content === "string" && message.content.includes("<csv_columns>"))?.content;
      if (body.jsonSchema?.properties?.counterparty && typeof prompt === "string") {
        const section = /<csv_columns>([\s\S]*?)<\/csv_columns>/.exec(prompt)?.[1] || "";
        const columns = [...section.matchAll(/<column>([\s\S]*?)<\/column>/g)].map(match => match[1]!);
        const aliases = { date: /^(?:(?:booking|payment|transaction) )?date$/i, description: /^(description|text|memo|merchant)$/i, counterparty: /^(counterparty|from\/to)$/i, amount: /^(?:transaction )?amount$/i, balance: /^(?:(?:running|current) )?balance$/i, currency: /^currency$/i };
        const mapping = Object.fromEntries(Object.entries(aliases).flatMap(([field, pattern]) => { const column = columns.find(value => pattern.test(value)); return column ? [[field, column]] : []; }));
        return reply({ text: JSON.stringify(mapping), finishReason: "stop" });
      }
      return reply({ text: "This is an offline demonstration. Connect a real key to use this feature.", finishReason: "stop" });
    }
    case "payments.payment-link.create": {
      const linkRef = `ref_${randomUUID().replace(/-/g, "").toUpperCase().replace(/[ILOU]/g,"0").slice(0,26)}`;
      const value = { ref: linkRef, paymentLinkId: `link_${randomUUID()}`, status: "created", amount: { amount: body.amount, currency: body.currency }, paymentUrl: `https://payments.example.test/${linkRef}`, linkExpiresAt: new Date(Date.now()+24*60*60*1000).toISOString() };
      paymentLinks.set(linkRef, value); return reply(value);
    }
    case "payments.payment-link.get": return reply({ ...(paymentLinks.get(body.ref) || { paymentLinkId: body.ref, status: "created" }), payments: [] });
    case "payments.checkout.create": {
      const checkoutRef = `ref_${randomUUID().replace(/-/g, "").slice(0,26)}`;
      return reply({ ref: checkoutRef, checkoutUrl: `https://checkout.example.test/${checkoutRef}`, expiresAt: new Date(Date.now()+24*60*60*1000).toISOString() });
    }
    case "payments.checkout.get": return reply({ status: "unpaid", payments: [] });
    case "finance.exchange-rate.get": return reply({ rate: 1, from: body.from, to: body.to, date: new Date().toISOString().slice(0, 10) });
    case "email.accounts.list": return reply({ results: [] });
    case "email.send": return reply({ ref: ref("3"), status: "sent" });
    default: return reply({ error: { code: "upstream_unavailable", message: "This feature is not available yet." } }, 502);
  }
}
