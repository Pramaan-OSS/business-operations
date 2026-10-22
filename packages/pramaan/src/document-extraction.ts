export type DocumentExtraction = { data: unknown; truncated: boolean };
/** A completed extraction wraps its fields in data; partial data must stay marked. */
export function validateDocumentExtraction(value: unknown): DocumentExtraction {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
      !("data" in value) || !("truncated" in value) || typeof value.truncated !== "boolean") {
    throw new Error("The document extraction result could not be confirmed.");
  }
  return value as DocumentExtraction;
}
