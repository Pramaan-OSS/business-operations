import { z } from "zod";
import { ConnectedApps } from "@business-operations/storage/connected-apps";
import type { JsonObject } from "@business-operations/pramaan";
import { hasScope, READ_ONLY_ANNOTATIONS, WRITE_ANNOTATIONS, type McpContext } from "../types";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerConnectedAppTools(server: McpServer, ctx: McpContext, client?: ConnectedApps) {
  const owner = `${ctx.teamId}.${ctx.userId}`;
  const apps = () => client ?? new ConnectedApps();
  const reply = (value: Record<string, unknown>) => ({ content: [{ type: "text" as const, text: JSON.stringify(value) }], structuredContent: value });
  if (hasScope(ctx, "teams.read")) server.registerTool("apps_catalog_search", {
    title: "Find Connected App Actions",
    description: "Search the current app catalogue and list your connections. Include the app name and desired action in the query. Returns action ids and their input contracts.",
    inputSchema: { query: z.string().min(1).max(500), app: z.string().max(128).optional() }, annotations: READ_ONLY_ANNOTATIONS,
  }, async ({ query, app }) => reply({ actions: await apps().catalog(query, app), connections: (await apps().connections(owner)).results }));
  if (!hasScope(ctx, "teams.write")) return;
  server.registerTool("apps_connection_start", {
    title: "Review App Connection",
    description: "Open the dashboard connection review. The person must review permissions and authorise before a connection starts. This tool never grants access.",
    inputSchema: { app: z.string().min(1).max(128) }, annotations: READ_ONLY_ANNOTATIONS,
  }, async ({ app }) => {
    if (!(await apps().catalog("available actions", app)).some(row => row.app === app)) throw new Error("This feature is not available yet.");
    return reply({ approvalRequired: true, reviewUrl: "/apps", message: "Choose the app in Connected apps, review its permissions and authorise. Nothing has been connected." });
  });
  server.registerTool("apps_action_execute", {
    title: "Read or Review App Action",
    description: "Use catalogue action ids and inputs. Read-only actions run against your connected account. All other actions produce a dashboard review for separate approval; nothing is sent or changed during review.",
    inputSchema: { app: z.string().min(1).max(128), action: z.string().min(1).max(256), input: z.record(z.string(), z.unknown()) }, annotations: WRITE_ANNOTATIONS,
  }, async ({ app, action, input }) => {
    const client = apps();
    const entry = (await client.catalog(action, app)).find(row => row.app === app && row.action === action);
    if (!entry) throw new Error("This feature is not available yet.");
    if (entry.readOnly === true) return reply({ result: await client.read(owner, app, action, input as JsonObject) });
    const review = await client.review(owner, app, action, input as JsonObject);
    return reply({ reviewId: review.id, approvalRequired: true, reviewUrl: `/apps/review?id=${review.id}`, message: "Review and approve this action in the dashboard. Nothing has been sent or changed." });
  });
}
