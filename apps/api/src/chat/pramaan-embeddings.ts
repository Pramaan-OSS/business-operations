import type { EmbeddingModelV2 } from "@ai-sdk/provider";
import { pramaanFromEnv, EMBEDDING_BATCH_SIZE, type Pramaan } from "@business-operations/pramaan";

/**
 * The platform embedding capability behind assistant tool selection.
 * Each index keeps its returned space for later searches; old disk caches are not reused.
 */
export function createPramaanEmbeddingModel(client?: Pramaan): EmbeddingModelV2<string> {
  let space: string | undefined;
  let dimensions: number | undefined;
  return {
    specificationVersion: "v2",
    provider: "pramaan",
    modelId: "embed-2",
    maxEmbeddingsPerCall: EMBEDDING_BATCH_SIZE,
    supportsParallelCalls: false,

    async doEmbed({ values, abortSignal }) {
      const pramaan = client ?? pramaanFromEnv();
      if (!pramaan) {
        throw new Error("Embeddings are not available");
      }
      if (abortSignal?.aborted) {
        throw new Error("Embedding request was aborted");
      }

      const result = await pramaan.textEmbed({
        input: values,
        inputType: "document",
        ...(space ? { space } : { model: "embed-2" }),
      });

      if (!result.space || space && result.space !== space || dimensions !== undefined && result.dimensions !== dimensions || result.embeddings.length !== values.length || result.embeddings.some(vector => vector.length !== result.dimensions || vector.some(value => !Number.isFinite(value)))) throw new Error("The search vector space could not be confirmed.");
      space = result.space;
      dimensions = result.dimensions;
      return {
        embeddings: result.embeddings.map((vector) => [...vector]),
        usage: result.usage ? { tokens: result.usage.inputTokens } : undefined,
      };
    },
  };
}
