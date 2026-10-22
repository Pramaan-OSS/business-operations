import type { Pramaan, TextEmbedRequest, TextEmbedResult } from "./index";
/** Sixteen vectors fit the response limit even at the largest supported dimension. */
export const EMBEDDING_BATCH_SIZE = 16;
export async function embedInSpace(client: Pramaan, input: TextEmbedRequest): Promise<TextEmbedResult> {
  if (!input.input.length) throw new Error("Choose text to embed.");
  let result: TextEmbedResult | undefined;
  let tokens = 0;
  for (let offset = 0; offset < input.input.length; offset += EMBEDDING_BATCH_SIZE) {
    const texts = input.input.slice(offset, offset + EMBEDDING_BATCH_SIZE);
    const next = await client.textEmbed({ ...input, input: texts, ...(result ? { space: result.space } : {}) });
    if (!next.space || !Number.isInteger(next.dimensions) || next.dimensions < 1 ||
        next.embeddings.length !== texts.length || next.embeddings.some(vector => vector.length !== next.dimensions || vector.some(n => !Number.isFinite(n))) ||
        result && (next.space !== result.space || next.dimensions !== result.dimensions || next.model !== result.model)) {
      throw new Error("The search vector space could not be confirmed.");
    }
    tokens += next.usage?.inputTokens || 0;
    result = { ...next, embeddings: [...(result?.embeddings || []), ...next.embeddings], usage: { inputTokens: tokens } };
  }
  return result!;
}
