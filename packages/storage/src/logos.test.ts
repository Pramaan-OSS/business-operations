import { expect, test } from "bun:test";
import { mkdtemp, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { FakePramaan } from "@business-operations/pramaan/fake";
import { getCompanyLogo } from "./logos";

test("keeps a local logo after the signed source expires", async () => {
  const scratch = fileURLToPath(new URL("../../../.scratch/", import.meta.url));
  await mkdir(scratch, { recursive: true });
  const previous = process.env.STORAGE_ROOT;
  process.env.STORAGE_ROOT = await mkdtemp(`${scratch}logos-`);
  const bytes = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aS9sAAAAASUVORK5CYII=", "base64");
  const client = new FakePramaan({ "companies.logo.get": () => ({ file: { fileId: `file_${"0".repeat(26)}`, url: "https://api.pramaan.dev/files/signed", expiresAt: "2099-01-01T00:00:00Z", contentType: "image/png", sizeBytes: bytes.length }, placeholderAllowed: false }) });
  let downloads = 0;
  client.routeFileDownload(() => { downloads++; return bytes; });
  try {
    const first = await getCompanyLogo({ domain: "example.test" }, client);
    client.route({ "companies.logo.get": () => { throw new Error("The source has expired."); } });
    const second = await getCompanyLogo({ domain: "example.test" }, client);
    expect(first.data.equals(bytes)).toBe(true);
    expect(second.data.equals(bytes)).toBe(true);
    expect(downloads).toBe(1);
    expect(client.callsTo("companies.logo.get")).toEqual([{ domain: "example.test", format: "png", size: 256, fallback: "error" }]);
  } finally {
    if (previous === undefined) delete process.env.STORAGE_ROOT; else process.env.STORAGE_ROOT = previous;
  }
});
