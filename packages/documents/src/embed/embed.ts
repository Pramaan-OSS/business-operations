import {
  pramaanFromEnv,
  embedInSpace,
  type TextEmbedResult,
} from "@business-operations/pramaan";

/**
 * Embeddings for documents, through the platform embedding capability.
 * Vectors live in one space per call; store the space id next to them and
 * send it back on later searches so vectors stay comparable.
 */

function client() {
  const pramaan = pramaanFromEnv();
  if (!pramaan) {
    throw new Error("Embeddings are not available");
  }
  return pramaan;
}

async function embed(inputs: string[], space?: string): Promise<TextEmbedResult> {
  const pramaan = client();
  const result = await embedInSpace(pramaan, { input: inputs, inputType: "document", ...(space ? { space } : { dimensions: 1024 }) });
  if (result.dimensions !== 1024 || result.embeddings.length !== inputs.length || !result.space || result.embeddings.some(vector => vector.length !== 1024 || vector.some(value => !Number.isFinite(value)))) throw new Error("The search vectors could not be confirmed.");
  return result;
}

export class Embed {
  public async embedMany(content: string[], space?: string): Promise<{
    embeddings: number[][];
    model: string;
    space: string;
  }> {
    const result = await embed(content, space);

    return {
      embeddings: result.embeddings.map((vector) => [...vector]),
      model: result.model,
      space: result.space,
    };
  }

  public async embed(content: string, space?: string): Promise<{
    embedding: number[];
    model: string;
    space: string;
  }> {
    const result = await embed([content], space);

    return {
      embedding: [...(result.embeddings[0] ?? [])],
      model: result.model,
      space: result.space,
    };
  }
}
