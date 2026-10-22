import { createHash } from "node:crypto";
import { requirePramaan, type Pramaan, type Caps } from "@business-operations/pramaan";
import { putObject, signedUrl } from "./index";

/** Personal content stays in the response and private storage; source URLs never reach the browser. */
export async function receiveImessage(owner: string, input: Caps.ImessageReceiveRequest, client?: Pramaan) {
  const p = client ?? requirePramaan();
  const result = await p.imessageMessageReceive(input);
  if (!result.message) return { found: false as const };
  const { files, ...message } = result.message;
  const localFiles = [];
  for (const file of files ?? []) {
    const path = `${createHash("sha256").update(owner).digest("hex")}/${createHash("sha256").update(file.fileId).digest("hex")}`;
    const bytes = await p.downloadHostedFile(file);
    await putObject({ bucket: "messages", path, data: bytes });
    const { signedUrl: url } = await signedUrl({ bucket: "messages", path, expireIn: 3600, download: true });
    localFiles.push({ url, contentType: file.contentType, sizeBytes: file.sizeBytes });
  }
  return { found: true as const, message: { ...message, files: localFiles } };
}
