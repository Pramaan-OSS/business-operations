import { documentDate } from "./utils/document-date";
import { requirePramaan, runReadOnlyCapability, validateDocumentExtraction, type Pramaan } from "@business-operations/pramaan";
import { readSignedObjectUrl } from "@business-operations/storage";
import { z } from "zod/v4";
import type { GetDocumentRequest, GetInvoiceOrReceiptResponse } from "./types";

export const intakeSchema = z.object({
  name: z.string().nullable(), date: z.string().nullable().describe("Issue date as YYYY-MM-DD, or null if uncertain."), amount: z.number().nullable(),
  currency: z.string().nullable(), website: z.string().nullable(), description: z.string().nullable(),
  tax_amount: z.number().nullable(), tax_rate: z.number().nullable(), tax_type: z.string().nullable(),
  invoice_number: z.string().nullable(), document_type: z.enum(["invoice", "receipt", "other"]),
});

export class DocumentClient {
  constructor(private readonly client?: Pramaan) {}
  public async getInvoiceOrReceipt(params: GetDocumentRequest): Promise<GetInvoiceOrReceiptResponse> {
    const p = this.client ?? requirePramaan();
    let content = params.content;
    if (!content && params.documentUrl) {
      const local = await readSignedObjectUrl(params.documentUrl);
      if (local) content = local.data.toString("base64");
    }
    if (!content && !params.documentUrl) throw new Error("Choose a document to process.");
    if (content && Buffer.from(content, "base64").length > 10 * 1024 * 1024) throw new Error("Documents must be no larger than 10 MiB.");
    const source = content ? { content } : { url: params.documentUrl! };
    const result = await runReadOnlyCapability(p, "document.extract", {
      ...source,
      schema: z.toJSONSchema(intakeSchema, { target: "draft-7" }),
      prompt: "Extract invoice or receipt fields exactly as written. Use null for missing fields. Never infer a payment or booking. Amounts are in whole currency units, not minor units.",
    }, { signal: params.signal });
    return readReceiptFields(result);
  }
}

/** Decode a completed job, also usable when recovering its already-paid result. */
export function readReceiptFields(result: unknown): GetInvoiceOrReceiptResponse {
  const extraction = validateDocumentExtraction(result);
  if (extraction.truncated) throw new Error("The extracted document was cut short. Review it manually.");
  const extracted = intakeSchema.parse(extraction.data);
  return { ...extracted, date: documentDate(extracted.date), type: extracted.document_type === "receipt" ? "expense" : extracted.document_type };
}
