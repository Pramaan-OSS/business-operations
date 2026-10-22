import { expect, test } from "bun:test";
import { FakePramaan } from "@business-operations/pramaan/fake";
import { workflowAppChoices } from "./workflow-apps";

test("workflow choices intersect the catalogue, current contract and owned active connections", async () => {
  const p = new FakePramaan({
    "apps.catalog.search": () => ({ results: ["new_accounts", "new_tax", "disconnected", "unsupported"].map(app => ({ app, action: `${app}_read`, readOnly: true })) }),
    "apps.connections.list": input => ({ results: (input as {endUserRef: string}).endUserRef === "team.person" ? ["new_accounts", "new_tax", "unsupported"].map(app => ({ app, status: "active" })) : [] }),
  });
  p.routeOutcomes({ get: () => ({ inputSchema: { properties: { app: { enum: ["new_accounts", "disconnected"] }, taxApp: { const: "new_tax" } } } }) });
  expect(await workflowAppChoices("team.person", "invoice.process", p)).toEqual({ app: ["new_accounts"], taxApp: ["new_tax"] });
  expect(await workflowAppChoices("other.person", "tax.quote", p)).toEqual({ app: [] });
  p.routeOutcomes({ get: () => ({ inputSchema: {} }) });
  expect(await workflowAppChoices("team.person", "invoice.process", p)).toEqual({ app: [], taxApp: [] });
  expect(p.callsTo("apps.action.execute")).toHaveLength(0);
});
