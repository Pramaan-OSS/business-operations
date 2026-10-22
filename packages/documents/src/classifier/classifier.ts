import { requirePramaan, runReadOnlyOutcome, runReadOnlyCapability, validateDocumentExtraction, type Pramaan } from "@business-operations/pramaan";
import { z } from "zod/v4";
import { documentClassifierSchema, imageClassifierSchema } from "../schema";
import type { DocumentClassifierImageRequest, DocumentClassifierRequest } from "../types";

export class DocumentClassifier {
  constructor(private readonly client?: Pramaan) {}
  private async classify<T>(content: string, extension: string, schema: z.ZodType<T>) {
    const p = this.client ?? requirePramaan();
    const source = { content, extension };
    const report = await runReadOnlyOutcome(p, "document.classify", source);
    const classification = report.result as { kind?: string; language?: string; truncated?: boolean };
    if (!classification || typeof classification.kind !== "string" || classification.truncated)
      throw new Error("The document classification could not be confirmed.");
    const metadata = await runReadOnlyCapability(p, "document.extract", {
      ...source,
      schema: z.toJSONSchema(schema, { target: "draft-7" }),
      prompt: "Extract a descriptive title, summary, date and tags. Do not invent missing information.",
    });
    const extraction = validateDocumentExtraction(metadata);
    if (extraction.truncated) throw new Error("The extracted document was cut short. Review it manually.");
    return schema.parse(extraction.data);
  }
  public async classifyDocument({ content }: DocumentClassifierRequest) {
    return this.classify(Buffer.from(content).toString("base64"), "txt", documentClassifierSchema);
  }
  public async classifyImage({ content }: DocumentClassifierImageRequest) {
    const bytes = content instanceof ArrayBuffer ? new Uint8Array(content) : content;
    const extension = bytes[0] === 0xff && bytes[1] === 0xd8 ? "jpg" : bytes[0] === 0x47 ? "gif" : bytes[0] === 0x52 ? "webp" : "png";
    return this.classify(Buffer.from(bytes).toString("base64"), extension, imageClassifierSchema);
  }
}
