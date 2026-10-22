import { expect, test } from "bun:test";
import { mkdtemp, mkdir } from "node:fs/promises";
import { FakePramaan } from "@business-operations/pramaan/fake";
import { receiveImessage } from "./incoming-messages";
import { readSignedObjectUrl } from "./index";
test("copies message attachments before source expiry and returns only local links", async () => {
 await mkdir(".scratch", { recursive: true });
 const old = { root: process.env.STORAGE_ROOT, key: process.env.FILE_KEY_SECRET };
 process.env.STORAGE_ROOT = await mkdtemp(`${process.cwd()}/.scratch/messages-`);
 process.env.FILE_KEY_SECRET = "local-test-signing-secret-at-least-32-characters";
 const bytes = Buffer.from("private attachment");
 const client = new FakePramaan({ "imessage.message.receive": () => ({ found: true, message: { rowRef: "ref_00000000000000000000000000", direction: "inbound", kind: "attachments", files: [{ fileId: "file_00000000000000000000000000", url: "https://api.pramaan.dev/files/signed", expiresAt: "2099-01-01T00:00:00Z", contentType: "text/plain", sizeBytes: bytes.length }] } }) });
 client.routeFileDownload(() => bytes);
 try {
  const result = await receiveImessage("owned-team:user", { sender: "+447700900000", contact: "+447700900001" }, client);
  const url = result.message!.files[0]!.url;
  expect(url).not.toContain("api.pramaan.dev");
  expect((await readSignedObjectUrl(url))?.data.equals(bytes)).toBe(true);
  expect(JSON.stringify(result)).not.toContain("2099-01-01");
 } finally { for (const [key, value] of [["STORAGE_ROOT", old.root], ["FILE_KEY_SECRET", old.key]] as const) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } }
});
