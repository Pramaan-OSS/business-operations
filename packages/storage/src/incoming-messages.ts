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

/** The platform checkpoint contains the per-conversation positions. Persist even empty pages. */
export async function receiveWhatsapp(owner: string, connectionRef: string, client?: Pramaan) {
  const p = client ?? requirePramaan();
  const path = `${createHash("sha256").update(`${owner}:${connectionRef}`).digest("hex")}.json`;
  const { getObject } = await import("./index");
  const stored = await getObject({ bucket: "message-checkpoints", path });
  const since = stored ? JSON.parse(stored.data.toString()).since as string | undefined : undefined;
  const result = await p.whatsappInboundMessagesList({ connectionRef, since, limit: 50 });
  const messages = [];
  for (const { attachments, ...message } of result.messages) {
    const files = [];
    for (const file of attachments ?? []) {
      const filePath = `${createHash("sha256").update(owner).digest("hex")}/${createHash("sha256").update(file.fileId).digest("hex")}`;
      await putObject({ bucket: "messages", path: filePath, data: await p.downloadHostedFile(file) });
      const { signedUrl: url } = await signedUrl({ bucket: "messages", path: filePath, expireIn: 3600, download: true });
      files.push({ url, contentType: file.contentType, sizeBytes: file.sizeBytes });
    }
    messages.push({ ...message, files });
  }
  // Save the page before advancing so a browser disconnect cannot lose it.
  await putObject({ bucket: "message-pages", path: `${path}/${createHash("sha256").update(JSON.stringify(result)).digest("hex")}.json`, data: JSON.stringify({ messages }) });
  await putObject({ bucket: "message-checkpoints", path, data: JSON.stringify({ since: result.nextCursor ?? since }) });
  return { messages, hasCheckpoint: !!(result.nextCursor ?? since) };
}
