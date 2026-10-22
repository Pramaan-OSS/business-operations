import { readDocumentText } from "../pramaan";
import { parseOfficeAsync } from "officeparser";
import { cleanText, extractTextFromRtf } from "../utils";

export async function loadDocument({
  content,
  metadata,
}: {
  content: Blob;
  metadata: { mimetype: string };
}) {
  let document: string | null = null;

  switch (metadata.mimetype) {
    case "application/pdf":
    case "application/x-pdf": {
      try {
        const arrayBuffer = await content.arrayBuffer();
        const base64Content = Buffer.from(arrayBuffer).toString("base64");

        document = await readDocumentText({
          content: base64Content,
          extension: "pdf",
        });
      } catch (error) {
        // Log detailed error information for debugging
        const errorDetails: Record<string, unknown> = {
          error: error instanceof Error ? error.message : String(error),
          errorName: error instanceof Error ? error.name : typeof error,
        };
        console.error("Document text reading failed:", errorDetails);
        // Return null instead of throwing to allow the process to continue
        // The upstream code will handle null documents appropriately
        document = null;
      }

      break;
    }

    case "text/csv":
    case "text/markdown":
    case "text/plain": {
      document = await content.text();
      break;
    }

    case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
    case "application/vnd.oasis.opendocument.text":
    case "application/vnd.oasis.opendocument.spreadsheet":
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    case "application/msword":
    case "application/vnd.ms-excel":
    case "application/vnd.oasis.opendocument.presentation":
    case "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    case "application/pptx":
    case "application/docx": {
      const arrayBuffer = await content.arrayBuffer();
      const result = await parseOfficeAsync(Buffer.from(arrayBuffer));

      document = result;
      break;
    }

    case "application/rtf": {
      const arrayBuffer = await content.arrayBuffer();
      const text = extractTextFromRtf(Buffer.from(arrayBuffer));

      document = text;
      break;
    }

    default: {
      throw new Error(`Unsupported file type: ${metadata.mimetype}`);
    }
  }

  return document ? cleanText(document) : null;
}
