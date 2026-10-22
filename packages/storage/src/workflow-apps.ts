import { requirePramaan, type Pramaan } from "@business-operations/pramaan";
import { ConnectedApps } from "./connected-apps";

export async function workflowAppChoices(owner: string, outcome: "invoice.process" | "tax.quote", p: Pramaan = requirePramaan()) {
  const apps = new ConnectedApps(p);
  const [catalogue, connections, description] = await Promise.all([
    apps.catalog(outcome === "invoice.process" ? "accounting invoice tax" : "calculate sales tax quote"),
    apps.connections(owner), p.outcomes.get(outcome),
  ]);
  const connected = new Set(connections.results.filter(row => row.status === "active").map(row => row.app));
  const properties = description.inputSchema.properties as Record<string, unknown> | undefined;
  const choices: Record<string, string[]> = {};
  for (const field of outcome === "invoice.process" ? ["app", "taxApp"] : ["app"]) {
    const contract = properties?.[field] as { enum?: unknown[]; const?: unknown; type?: unknown } | undefined;
    // Fail closed when the published contract does not describe this field.
    const allowed = contract?.const !== undefined ? [contract.const] : contract?.enum;
    choices[field] = contract ? [...new Set(catalogue.map(row => row.app))].filter(id => connected.has(id) && (allowed ? allowed.includes(id) : contract.type === "string")) : [];
  }
  return choices;
}
