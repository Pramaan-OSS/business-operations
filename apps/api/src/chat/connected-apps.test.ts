import { expect, test } from "bun:test";
import * as registrations from "../mcp/tools";
import { registerConnectedAppTools } from "../mcp/tools/connected-apps";
import { SCOPES } from "../utils/scopes";
import { buildSystemPrompt } from "./prompt";
import type { ConnectedApps } from "@business-operations/storage/connected-apps";

const context = { teamId: "team", userId: "person", scopes: [...SCOPES], apiUrl: "http://localhost:3002", timezone: "UTC", locale: "en", countryCode: null, dateFormat: null, timeFormat: 24, db: {} } as any;
test("prompt and exposed tool contracts use neutral integration names", () => {
  const definitions: unknown[] = [];
  const server = { registerTool: (name: string, definition: unknown) => definitions.push({ name, definition }) } as any;
  for (const register of Object.values(registrations)) register(server, context);
  registerConnectedAppTools(server, context);
  const prompt = buildSystemPrompt({ fullName: "Example", locale: "en", timezone: "UTC", dateFormat: null, timeFormat: 24, baseCurrency: "GBP", teamName: null, countryCode: null, localTime: null, mentionedApps: [{ slug: "example", name: "Example app" }] });
  const forbidden = /midday|plaid|teller|gocardless|nordigen|enablebanking|stripe|sentry|openpanel|openai|gemini|mistral|anthropic|composio|xero|quickbooks|fortnox|sendblue/i;
  expect(prompt).not.toMatch(forbidden);
  expect(JSON.stringify(definitions)).not.toMatch(forbidden);
  for (const name of ["apps_catalog_search", "apps_connection_start", "apps_action_execute"]) {
    expect(prompt).toContain(name);
    expect(definitions.some(value => (value as { name: string }).name === name)).toBe(true);
  }
});

test("connected-app writes and connections only return approval reviews", async () => {
  const handlers = new Map<string, (input: any) => Promise<any>>();
  const calls: string[] = [];
  const client = {
    catalog: async () => [{ app: "example", action: "read", readOnly: true }, { app: "example", action: "send" }],
    connections: async (owner: string) => { expect(owner).toBe("team.person"); return { results: [] }; },
    read: async () => { calls.push("read"); return { result: "owned" }; },
    review: async () => { calls.push("review"); return { id: "review-id" }; },
    start: async () => { throw new Error("Connection approval was bypassed"); },
    approve: async () => { throw new Error("Action approval was bypassed"); },
  } as unknown as ConnectedApps;
  registerConnectedAppTools({ registerTool: (name: string, _: unknown, handler: any) => handlers.set(name, handler) } as any, context, client);
  expect((await handlers.get("apps_connection_start")!({ app: "example" })).structuredContent.approvalRequired).toBe(true);
  expect((await handlers.get("apps_action_execute")!({ app: "example", action: "send", input: {} })).structuredContent.approvalRequired).toBe(true);
  await handlers.get("apps_action_execute")!({ app: "example", action: "read", input: {} });
  expect(calls).toEqual(["review", "read"]);
  const limited: string[] = [];
  registerConnectedAppTools({ registerTool: (name: string) => limited.push(name) } as any, { ...context, scopes: ["teams.read"] }, client);
  expect(limited).toEqual(["apps_catalog_search"]);
});
