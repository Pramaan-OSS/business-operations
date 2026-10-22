/** Both live and offline requests must identify what is being embedded. */
export function validateEmbeddingInput(value: unknown): void {
  const input = value as { inputType?: unknown } | null;
  if (!input || !["query", "document"].includes(String(input.inputType))) {
    throw new Error("An embedding request must identify its input as query or document.");
  }
}
