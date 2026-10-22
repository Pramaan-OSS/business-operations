import { describe, expect, test } from "bun:test";
import { mkdtemp, mkdir } from "node:fs/promises";
import path from "node:path";
import {
  getObject,
  putObject,
  removeObject,
  signedUrl,
  verifySignedUrl,
} from "../src/index";

const scratch = path.resolve(__dirname, "../../../.scratch");
await mkdir(scratch, { recursive: true });

process.env.FILE_KEY_SECRET = process.env.FILE_KEY_SECRET || "test-secret";

describe("local storage", () => {
  test("put, get and remove round-trip", async () => {
    process.env.STORAGE_ROOT = await mkdtemp(path.join(scratch, "storage-"));
    await putObject({
      bucket: "vault",
      path: ["team_1", "inbox", "invoice.pdf"],
      data: Buffer.from("%PDF-1.4 test"),
    });
    const object = await getObject({ bucket: "vault", path: "team_1/inbox/invoice.pdf" });
    expect(object?.data.toString()).toBe("%PDF-1.4 test");
    expect(object?.contentType).toBe("application/pdf");
    await removeObject({ bucket: "vault", path: ["team_1", "inbox", "invoice.pdf"] });
    expect(await getObject({ bucket: "vault", path: "team_1/inbox/invoice.pdf" })).toBeNull();
    await removeObject({ bucket: "vault", path: "missing/file.bin" });
  });

  test("paths cannot escape the storage root", async () => {
    const root = await mkdtemp(path.join(scratch, "storage-"));
    process.env.STORAGE_ROOT = root;
    // Parent hops clamp into the bucket, never land outside the root.
    await expect(putObject({ bucket: "vault", path: ["..", "clamped.bin"], data: "x" })).rejects.toThrow("Invalid storage path");
    await expect(putObject({ bucket: "vault", path: "team/../other/file.bin", data: "x" })).rejects.toThrow("Invalid storage path");
    await expect(getObject({ bucket: "vault", path: "../outside.bin" })).rejects.toThrow("Invalid storage path");
    await expect(putObject({ bucket: "vault", path: "..", data: "x" })).rejects.toThrow("Invalid storage path");
    await expect(putObject({ bucket: "bad name", path: "a", data: "x" })).rejects.toThrow(
      "Invalid bucket name"
    );
  });

  test("signed URLs verify and expire", async () => {
    process.env.STORAGE_ROOT = await mkdtemp(path.join(scratch, "storage-"));
    const { signedUrl: url } = await signedUrl({
      bucket: "vault",
      path: "team_1/file.pdf",
      expireIn: 60,
      baseUrl: "https://api.example.test",
    });
    expect(url).toContain("https://api.example.test/files/signed?");
    const params = new URL(url).searchParams;
    expect(
      verifySignedUrl({
        bucket: params.get("bucket")!,
        path: params.get("path")!,
        expiresAt: Number(params.get("expiresAt")),
        signature: params.get("signature")!,
      })
    ).toBe(true);
    expect(
      verifySignedUrl({
        bucket: params.get("bucket")!,
        path: params.get("path")!,
        expiresAt: Date.now() - 10_000,
        signature: params.get("signature")!,
      })
    ).toBe(false);
    expect(
      verifySignedUrl({
        bucket: params.get("bucket")!,
        path: "other/file.pdf",
        expiresAt: Number(params.get("expiresAt")),
        signature: params.get("signature")!,
      })
    ).toBe(false);
  });
});
