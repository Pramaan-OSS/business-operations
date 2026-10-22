import { createMcpServer } from "@api/mcp/server";
import type { McpContext } from "@api/mcp/types";
import { createPramaanEmbeddingModel } from "@api/chat/pramaan-embeddings";
import { expandScopes } from "@api/utils/scopes";
import { normalizeJsonSchema, pramaanFromEnv } from "@business-operations/pramaan";
import { logger } from "@business-operations/logger";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { jsonSchema, tool, type Tool, type ToolSet } from "ai";
import type { ToolIndex } from "toolpick";
import { createToolIndex } from "toolpick";

export type ChatMcpClient = Client;
type ToolDefinitions = Awaited<
  ReturnType<ChatMcpClient["listTools"]>
>["tools"];

let cachedDefinitions: ToolDefinitions | null = null;
let cachedIndex: ToolIndex<any> | null = null;
let inflightIndexPromise: Promise<ToolIndex<any>> | null = null;

async function connectInProcess(ctx: McpContext): Promise<ChatMcpClient> {
  const mcpServer = createMcpServer(ctx);
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();

  await mcpServer.connect(serverTransport);

  const client = new Client({
    name: "business-operations-chat",
    version: "1.0.0",
  });
  await client.connect(clientTransport);

  return client as ChatMcpClient;
}

/** Turns one MCP tool definition into an agent tool that calls it in process. */
export function toAgentTool(
  definition: { name: string; description?: string; inputSchema?: unknown },
  client: ChatMcpClient,
): Tool {
  const original = definition.inputSchema ?? { type: "object", properties: {} };
  let inputSchema: Record<string, unknown>;
  let wrapped = false;
  try { inputSchema = normalizeJsonSchema(original, "Action"); }
  catch {
    // Preserve the full contract at the local executor; unsupported constraints are never stripped.
    const contract = JSON.stringify(original);
    if (contract.length > 16000) throw new Error("This action's input contract is too large.");
    wrapped = true;
    inputSchema = { type: "object", properties: { arguments: { type: "string", maxLength: 16000, description: `A JSON object matching this locally validated contract: ${contract}` } }, required: ["arguments"], additionalProperties: false };
  }
  return tool({
    description: definition.description ?? "",
    inputSchema: jsonSchema(inputSchema as Parameters<typeof jsonSchema>[0]),
    execute: async (args) => {
      let argumentsValue = args ?? {};
      if (wrapped) {
        const encoded = (args as { arguments?: unknown })?.arguments;
        if (typeof encoded !== "string" || encoded.length > 16000) throw new Error("Check the action input.");
        try { argumentsValue = JSON.parse(encoded); } catch { throw new Error("Check the action input."); }
        if (!argumentsValue || typeof argumentsValue !== "object" || Array.isArray(argumentsValue)) throw new Error("Check the action input.");
      }
      const result = await client.callTool({
        name: definition.name,
        arguments: argumentsValue as Record<string, unknown>,
      });

      const structured = (
        result as { structuredContent?: unknown; isError?: boolean }
      ).structuredContent;
      if (structured !== undefined) {
        return structured;
      }

      const content = (result as { content?: Array<{ type: string; text?: string }> })
        .content;
      if (Array.isArray(content)) {
        return content
          .map((part) => (part.type === "text" ? (part.text ?? "") : ""))
          .join("");
      }

      return result;
    },
  });
}

export function ensureToolIndex(ctx: McpContext): Promise<ToolIndex<any>> {
  if (cachedIndex) return Promise.resolve(cachedIndex);
  if (inflightIndexPromise) return inflightIndexPromise;

  inflightIndexPromise = (async () => {
    const client = await connectInProcess(ctx);
    const { tools: definitions } = await client.listTools();
    cachedDefinitions = definitions as ToolDefinitions;

    const tools: ToolSet = {};
    for (const definition of definitions) {
      tools[definition.name] = toAgentTool(definition, client);
    }

    const index = await createToolIndex(tools, {
      embeddingModel: createPramaanEmbeddingModel(),
      relatedTools: {
        invoices_create: ["customers_list"],
        invoices_create_from_tracker: ["customers_list"],
        invoice_recurring_create: ["customers_list"],
        tracker_timer_start: ["tracker_projects_list"],
        tracker_entries_create: ["tracker_projects_list"],
        tracker_entries_list: ["tracker_projects_list"],
        tracker_projects_list: ["tracker_entries_list"],
        transactions_update: ["categories_list"],
      },
    });

    await index.warmUp();

    cachedIndex = index;
    return index;
  })().catch((err) => {
    inflightIndexPromise = null;
    throw err;
  });

  return inflightIndexPromise;
}

export function getToolDefinitions(): ToolDefinitions {
  if (!cachedDefinitions) {
    throw new Error(
      "Tool definitions not bootstrapped — call ensureToolIndex first",
    );
  }
  return cachedDefinitions;
}

/**
 * Build a prepareStep function that delegates to the cached tool index
 * but guarantees `alwaysActive` tool names are always exposed to the model.
 *
 * Toolpick's own `alwaysActive` option filters names against the index,
 * which excludes built-in tools like `web_search`. This wrapper
 * appends them after selection so they're never dropped.
 */
export function buildPrepareStep<T extends Record<string, Tool>>(options: {
  maxTools: number;
  alwaysActive?: string[];
  allTools?: T;
}): (stepOptions: any) => Promise<any> {
  if (!cachedIndex) {
    throw new Error("Tool index not bootstrapped — call ensureToolIndex first");
  }

  const base = cachedIndex.prepareStep({ maxTools: options.maxTools });
  const always = options.alwaysActive ?? [];

  return async (stepOptions: any) => {
    const step = await base(stepOptions);
    if (step?.activeTools && always.length > 0) {
      for (const name of always) {
        if (!step.activeTools.includes(name)) {
          step.activeTools.push(name);
        }
      }
    }
    return step;
  };
}

export function getSearchTool() {
  if (!cachedIndex) {
    throw new Error("Tool index not bootstrapped — call ensureToolIndex first");
  }
  return cachedIndex.searchTool();
}

/** The assistant's public-web search, answered by the platform search capability. */
export function getWebSearchTool(): Tool {
  return tool({
    description: "Search the public web for real-time information.",
    inputSchema: jsonSchema<{ query: string }>({
      type: "object",
      properties: {
        query: { type: "string", description: "The search query." },
      },
      required: ["query"],
      additionalProperties: false,
    }),
    execute: async ({ query }) => {
      const pramaan = pramaanFromEnv();
      if (!pramaan) {
        return { error: "Web search is not available yet." };
      }

      try {
        const result = await pramaan.webSearch({ query, limit: 8 });
        return {
          query,
          results: result.results ?? [],
        };
      } catch (error) {
        logger.warn("[chat] Web search failed", {
          error: error instanceof Error ? error.message : String(error),
        });
        return { query, results: [] };
      }
    },
  });
}

/**
 * Pre-warm the tool index at server startup so the first chat request
 * doesn't pay the bootstrap + embedding cost. Safe to call multiple
 * times — subsequent calls are no-ops once the index is cached.
 */
export function warmToolIndex(): void {
  const stubCtx: McpContext = {
    db: {} as McpContext["db"],
    teamId: "warmup",
    userId: "warmup",
    userEmail: null,
    scopes: expandScopes(["apis.all"]) as McpContext["scopes"],
    apiUrl: process.env.BUSINESS_OPERATIONS_API_URL ?? "http://localhost:3002",
    timezone: "UTC",
    locale: "en",
    countryCode: null,
    dateFormat: null,
    timeFormat: 24,
  };

  ensureToolIndex(stubCtx).catch((err) => {
    logger.warn(
      "[chat] Tool index warm-up failed (will retry on first request)",
      {
        error: err instanceof Error ? err.message : String(err),
      },
    );
  });
}

export async function createExecutionClient(ctx: McpContext) {
  return connectInProcess(ctx);
}
