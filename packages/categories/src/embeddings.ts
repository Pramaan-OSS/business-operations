import {
  pramaanFromEnv,
  embedInSpace,
  type TextEmbedResult,
} from "@business-operations/pramaan";

/**
 * Category embeddings, through the platform embedding capability.
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

/**
 * Generate a single embedding for a category name
 */
export async function generateCategoryEmbedding(categoryName: string, space?: string) {
  const result = await embed([categoryName], space);

  return {
    embedding: [...(result.embeddings[0] ?? [])],
    model: result.model,
      space: result.space,
  };
}

/**
 * Generate embeddings for multiple category names
 */
export async function generateCategoryEmbeddings(categoryNames: string[], space?: string) {
  const result = await embed(categoryNames, space);

  return {
    embeddings: result.embeddings.map((vector) => [...vector]),
    model: result.model,
      space: result.space,
  };
}

/**
 * Category Embedding Service
 * Provides a consistent interface for generating category embeddings
 */
export class CategoryEmbeddings {
  /**
   * Generate embedding for a single category
   */
  public async embed(categoryName: string, space?: string) {
    return generateCategoryEmbedding(categoryName, space);
  }

  /**
   * Generate embeddings for multiple categories
   */
  public async embedMany(categoryNames: string[], space?: string) {
    return generateCategoryEmbeddings(categoryNames, space);
  }
}
