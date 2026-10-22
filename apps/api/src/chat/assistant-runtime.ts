import {
  buildPrepareStep,
  createExecutionClient,
  ensureToolIndex,
  getSearchTool,
  getToolDefinitions,
  getWebSearchTool,
  toAgentTool,
} from "@api/chat/tools";
import { createPramaanModel } from "@api/chat/pramaan-model";
import type { McpContext } from "@api/mcp/types";
import { logger } from "@business-operations/logger";
import {
  type ModelMessage,
  smoothStream,
  stepCountIs,
  ToolLoopAgent,
  type ToolSet,
} from "ai";

export async function streamBusinessOperationsAssistant(params: {
  mcpCtx: McpContext;
  systemPrompt: string;
  modelMessages: Array<ModelMessage>;
}) {
  const { mcpCtx, systemPrompt, modelMessages } = params;

  await ensureToolIndex(mcpCtx);

  // One in-process client per conversation: the tools run against this
  // request's context (team, user, scopes).
  const client = await createExecutionClient(mcpCtx);

  let closed = false;
  const closeClient = async () => {
    if (closed) return;
    closed = true;
    await client.close().catch(() => {});
  };

  try {
    const tools: ToolSet = {};
    for (const definition of getToolDefinitions()) {
      tools[definition.name] = toAgentTool(definition, client);
    }
    tools.web_search = getWebSearchTool();

    const agent = new ToolLoopAgent({
      model: createPramaanModel(),
      instructions: systemPrompt,
      tools: {
        ...tools,
        search_tools: getSearchTool(),
      },
      prepareStep: buildPrepareStep({
        maxTools: 12,
        alwaysActive: ["web_search", "search_tools"],
      }),
      stopWhen: stepCountIs(10),
      onFinish: closeClient,
    });

    const result = await agent.stream({
      messages: modelMessages,
      experimental_transform: smoothStream(),
    });

    return Object.assign(result, { cleanup: closeClient });
  } catch (error) {
    await closeClient();
    throw error;
  }
}
