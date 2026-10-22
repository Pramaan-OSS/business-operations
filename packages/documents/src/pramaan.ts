import {
  pramaanFromEnv,
  type Caps,
} from "@business-operations/pramaan";
import { createLoggerWithContext } from "@business-operations/logger";

const logger = createLoggerWithContext("documents:pramaan");

function client() {
  const pramaan = pramaanFromEnv();
  if (!pramaan) {
    throw new Error("Document processing is not available");
  }
  return pramaan;
}

/**
 * Read the text of a document (PDF, image, office file) through the
 * platform document capability. Optical character reading is on, so
 * scanned pages and photos of receipts come back as text too.
 */
export async function readDocumentText(input: {
  url?: string;
  content?: string;
  extension?: string;
}): Promise<string> {
  const pramaan = client();

  const request: Caps.DocumentParseRequest = {
    ...(input.url ? { url: input.url } : {}),
    ...(input.content ? { content: input.content } : {}),
    ...(input.extension ? { extension: input.extension } : {}),
  };

  const result = (await pramaan.documentParse({
    ...request,
    ocr: true,
  })) as { text?: string; truncated?: boolean };

  if (result.truncated) {
    logger.warn("Document text was truncated to fit the size limit");
  }

  return result.text ?? "";
}

/**
 * One structured field-extraction call: a prompt plus a JSON schema,
 * answered with parsed JSON. The schema must be in the platform's
 * bounded subset; the client validates it before sending.
 */
export async function extractFields<T>(input: {
  system: string;
  content: string;
  jsonSchema: Record<string, unknown>;
  maxTokens?: number;
}): Promise<T> {
  const pramaan = client();

  const result = (await pramaan.llmComplete({
    messages: [
      { role: "system", content: input.system },
      { role: "user", content: input.content },
    ],
    maxTokens: input.maxTokens ?? 1024,
    jsonSchema: input.jsonSchema,
  })) as { text?: string };

  return JSON.parse(result.text ?? "{}") as T;
}
