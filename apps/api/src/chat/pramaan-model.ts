import type {
  LanguageModelV2,
  LanguageModelV2CallOptions,
  LanguageModelV2Content,
  LanguageModelV2FinishReason,
  LanguageModelV2Prompt,
  LanguageModelV2StreamPart,
  LanguageModelV2Usage,
} from "@ai-sdk/provider";
import { pramaanFromEnv } from "@business-operations/pramaan";

/**
 * The platform generation capability behind the assistant's agent loop.
 * Every call goes through the Pramaan client; there is no direct model
 * provider in this product.
 */

type PlatformMessage =
  | { role: "system" | "user"; content: string }
  | {
      role: "assistant";
      content?: string;
      toolCalls?: Array<{
        id: string;
        name: string;
        arguments: Record<string, unknown>;
      }>;
    }
  | { role: "tool"; toolCallId: string; content: string };

function toolResultText(output: unknown): string {
  if (output === undefined || output === null) return "";
  if (typeof output === "string") return output;
  try {
    return JSON.stringify(output);
  } catch {
    return String(output);
  }
}

export function toPlatformMessages(
  prompt: LanguageModelV2Prompt,
): PlatformMessage[] {
  const messages: PlatformMessage[] = [];

  for (const message of prompt) {
    if (message.role === "system") {
      messages.push({ role: "system", content: message.content });
      continue;
    }

    if (message.role === "user") {
      const text = message.content
        .filter((part) => part.type === "text")
        .map((part) => part.text)
        .join("");
      messages.push({ role: "user", content: text });
      continue;
    }

    if (message.role === "assistant") {
      const text = message.content
        .filter((part) => part.type === "text")
        .map((part) => part.text)
        .join("");

      const toolCalls = message.content
        .filter((part) => part.type === "tool-call")
        .map((part) => ({
          id: part.toolCallId,
          name: part.toolName,
          arguments:
            part.input && typeof part.input === "object"
              ? (part.input as Record<string, unknown>)
              : {},
        }));

      const next: PlatformMessage = { role: "assistant" };
      if (text) next.content = text;
      if (toolCalls.length > 0) next.toolCalls = toolCalls;
      if (text || toolCalls.length > 0) messages.push(next);
      continue;
    }

    // Tool results, one platform message per part
    for (const part of message.content) {
      if (part.type === "tool-result") {
        messages.push({
          role: "tool",
          toolCallId: part.toolCallId,
          content: toolResultText(part.output),
        });
      }
    }
  }

  return messages;
}

function toPlatformTools(
  tools: LanguageModelV2CallOptions["tools"],
): Array<{ name: string; description?: string; parameters: unknown }> | undefined {
  if (!tools) return undefined;
  const functionTools = tools.filter((tool) => tool.type === "function");
  if (functionTools.length === 0) return undefined;
  return functionTools.map((tool) => ({
    name: tool.name,
    ...(tool.description ? { description: tool.description } : {}),
    parameters: tool.inputSchema,
  }));
}

function toUsage(usage: {
  inputTokens?: number;
  outputTokens?: number;
}): LanguageModelV2Usage {
  const inputTokens = usage.inputTokens ?? 0;
  const outputTokens = usage.outputTokens ?? 0;
  return {
    inputTokens,
    outputTokens,
    totalTokens:
      (usage as { totalTokens?: number }).totalTokens ??
      inputTokens + outputTokens,
    reasoningTokens: undefined,
    cachedInputTokens: undefined,
  };
}

function mapFinishReason(
  finishReason: string | undefined,
  hasToolCalls: boolean,
): LanguageModelV2FinishReason {
  if (hasToolCalls) return "tool-calls";
  switch (finishReason) {
    case "stop":
      return "stop";
    case "length":
      return "length";
    case "tool_calls":
    case "tool-calls":
      return "tool-calls";
    case "content_filter":
      return "content-filter";
    default:
      return "unknown";
  }
}

type PlatformToolCall = {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
};

type AssembledToolCall = { id?: string; name?: string; args: string };

function buildRequest(options: LanguageModelV2CallOptions) {
  const tools = toPlatformTools(options.tools);
  const maxOutputTokens = options.maxOutputTokens;
  const maxTokens =
    typeof maxOutputTokens === "number"
      ? Math.max(64, Math.min(8192, maxOutputTokens))
      : 2048;

  const request: Record<string, unknown> = {
    messages: toPlatformMessages(options.prompt),
    maxTokens,
    ...(tools ? { tools } : {}),
  };

  return request as unknown as Parameters<
    NonNullable<ReturnType<typeof pramaanFromEnv>>["llmChatStream"]
  >[0];
}

export function createPramaanModel(): LanguageModelV2 {
  return {
    specificationVersion: "v2",
    provider: "pramaan",
    modelId: "platform",
    supportedUrls: {},

    async doStream(options) {
      const pramaan = pramaanFromEnv();
      if (!pramaan) {
        throw new Error("Generation is not available");
      }

      const request = buildRequest(options);
      const events = pramaan.llmChatStream(request);

      const stream = new ReadableStream<LanguageModelV2StreamPart>({
        async start(controller) {
          const textId = "0";
          let textStarted = false;
          let openTools = new Map<number, AssembledToolCall>();
          let usage: { inputTokens?: number; outputTokens?: number } = {};
          let finishReason: string | undefined;
          let emittedToolCalls = false;

          const startText = () => {
            if (!textStarted) {
              textStarted = true;
              controller.enqueue({ type: "text-start", id: textId });
            }
          };

          try {
            controller.enqueue({ type: "stream-start", warnings: [] });

            for await (const event of events) {
              switch (event.type) {
                case "text_delta": {
                  startText();
                  controller.enqueue({
                    type: "text-delta",
                    id: textId,
                    delta: event.text,
                  });
                  break;
                }
                case "tool_call_start": {
                  openTools.set(event.index, { id: event.id, name: event.name, args: "" });
                  controller.enqueue({
                    type: "tool-input-start",
                    id: `t${event.index}`,
                    toolName: event.name,
                  });
                  break;
                }
                case "tool_call_delta": {
                  const call = openTools.get(event.index);
                  if (call) {
                    call.args += event.arguments;
                    controller.enqueue({
                      type: "tool-input-delta",
                      id: `t${event.index}`,
                      delta: event.arguments,
                    });
                  }
                  break;
                }
                case "tool_call_end": {
                  const call = openTools.get(event.index);
                  if (call && call.name !== undefined) {
                    controller.enqueue({
                      type: "tool-input-end",
                      id: `t${event.index}`,
                    });
                  }
                  break;
                }
                case "usage": {
                  usage = {
                    inputTokens: event.inputTokens,
                    outputTokens: event.outputTokens,
                  };
                  break;
                }
                case "done": {
                  const result = (event.result ?? {}) as {
                    text?: string;
                    finishReason?: string;
                    usage?: { inputTokens?: number; outputTokens?: number };
                    toolCalls?: PlatformToolCall[];
                  };

                  if (!textStarted && result.text) {
                    startText();
                    controller.enqueue({ type: "text-delta", id: textId, delta: result.text });
                  }
                  if (textStarted) {
                    controller.enqueue({ type: "text-end", id: textId });
                  }

                  const calls =
                    result.toolCalls && result.toolCalls.length > 0
                      ? result.toolCalls
                      : [...openTools.values()]
                          .filter((call) => call.name !== undefined)
                          .map((call) => ({
                            id: call.id ?? "",
                            name: call.name ?? "",
                            arguments: call.args ? JSON.parse(call.args) : {},
                          }));

                  for (const call of calls) {
                    emittedToolCalls = true;
                    controller.enqueue({
                      type: "tool-call",
                      toolCallId: call.id,
                      toolName: call.name,
                      input: JSON.stringify(call.arguments ?? {}),
                    });
                  }

                  finishReason = event.finishReason ?? result.finishReason;
                  usage = result.usage ?? usage;

                  controller.enqueue({
                    type: "finish",
                    usage: toUsage(usage),
                    finishReason: mapFinishReason(
                      finishReason,
                      emittedToolCalls,
                    ),
                  });
                  break;
                }
                default:
                  break;
              }
            }
          } catch (error) {
            controller.enqueue({ type: "error", error });
            controller.close();
            return;
          }

          controller.close();
        },
      });

      return { stream };
    },

    async doGenerate(options) {
      const pramaan = pramaanFromEnv();
      if (!pramaan) {
        throw new Error("Generation is not available");
      }

      const request = buildRequest(options) as Parameters<
        typeof pramaan.llmChat
      >[0];
      const result = await pramaan.llmChat(request);

      const content: Array<LanguageModelV2Content> = [];
      if (result.text) {
        content.push({ type: "text", text: result.text });
      }
      for (const call of result.toolCalls ?? []) {
        content.push({
          type: "tool-call",
          toolCallId: call.id,
          toolName: call.name,
          input: JSON.stringify(call.arguments ?? {}),
        });
      }

      return {
        content,
        finishReason: mapFinishReason(
          result.finishReason,
          (result.toolCalls?.length ?? 0) > 0,
        ),
        usage: toUsage(result.usage ?? {}),
        warnings: [],
      };
    },
  };
}
