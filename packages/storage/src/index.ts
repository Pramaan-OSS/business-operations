// Local-disk object storage: the one module every file put, get, delete and
// signed download URL in this product goes through. Buckets are top-level
// folders under STORAGE_ROOT (default: .data/storage next to the process).
// The optional Pramaan `storage.*` driver can replace this later without any
// caller changing: every caller uses these four functions only.

import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

function storageRoot(): string {
  return process.env.STORAGE_ROOT || path.join(process.cwd(), ".data", "storage");
}

/** The secret that signs download URLs (the app's own FILE_KEY_SECRET). */
function signingSecret(): string {
  const secret = process.env.FILE_KEY_SECRET;
  if (!secret) throw new Error("FILE_KEY_SECRET environment variable is not set.");
  return secret;
}

function resolveKey(bucket: string, filePath: string): string {
  const cleanBucket = bucket.replaceAll(/[^a-zA-Z0-9_-]/g, "");
  if (!cleanBucket || cleanBucket !== bucket) throw new Error("Invalid bucket name.");
  const clean = decodeURIComponent(filePath).replaceAll("\\", "/");
  if (!clean || clean.split("/").some(segment => !segment || segment === "." || segment === "..") || clean.includes("\0")) {
    throw new Error("Invalid storage path.");
  }
  return path.join(storageRoot(), cleanBucket, clean);
}

export type PutObjectInput = {
  bucket: string;
  /** Path inside the bucket, as segments or an encoded joined string. */
  path: string | ReadonlyArray<string>;
  data: Uint8Array | string;
};

/** Store one object, creating folders as needed. Overwrites on same path. */
export async function putObject(input: PutObjectInput): Promise<{ path: string }> {
  const joined = typeof input.path === "string" ? input.path : input.path.join("/");
  const target = resolveKey(input.bucket, joined);
  await mkdir(path.dirname(target), { recursive: true });
  const staging = `${target}.${randomUUID()}.partial`;
  try {
    await writeFile(staging, input.data, { mode: 0o600, flag: "wx" });
    await rename(staging, target);
  } finally { await rm(staging, { force: true }); }
  return { path: joined };
}

export type GetObjectResult = {
  data: Buffer;
  contentType: string;
};

const CONTENT_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".heic": "image/heic",
  ".csv": "text/csv",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".json": "application/json",
  ".txt": "text/plain",
  ".zip": "application/zip",
};

function contentTypeOf(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return CONTENT_TYPES[ext] || "application/octet-stream";
}

/** Read one object, or null when it does not exist. */
export async function getObject(input: {
  bucket: string;
  path: string | ReadonlyArray<string>;
}): Promise<GetObjectResult | null> {
  const joined = typeof input.path === "string" ? input.path : input.path.join("/");
  const target = resolveKey(input.bucket, joined);
  try {
    const data = await readFile(target);
    return { data, contentType: contentTypeOf(target) };
  } catch {
    return null;
  }
}

/** Delete one object. Missing objects are fine. */
export async function removeObject(input: {
  bucket: string;
  path: string | ReadonlyArray<string>;
}): Promise<void> {
  const joined = typeof input.path === "string" ? input.path : input.path.join("/");
  const target = resolveKey(input.bucket, joined);
  try {
    await stat(target);
    await rm(target, { force: true });
  } catch {
    // Nothing to delete.
  }
}

/**
 * A short-lived download URL on this app's own files endpoint. The token is
 * an HMAC over bucket, path and expiry; the files router verifies it and
 * streams the object. `download: true` asks the browser to save the file.
 */
export async function signedUrl(input: {
  bucket: string;
  path: string | ReadonlyArray<string>;
  /** Seconds the URL stays valid. */
  expireIn: number;
  download?: boolean;
  /** Overrides the API origin, mainly for tests. */
  baseUrl?: string;
}): Promise<{ signedUrl: string }> {
  const joined = typeof input.path === "string" ? input.path : input.path.join("/");
  const expiresAt = Date.now() + input.expireIn * 1000;
  const payload = `${input.bucket}:${joined}:${expiresAt}`;
  const signature = createHmac("sha256", signingSecret()).update(payload).digest("base64url");
  const base =
    input.baseUrl ??
    process.env.APP_DOWNLOAD_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:3002";
  const query = new URLSearchParams({
    bucket: input.bucket,
    path: joined,
    expiresAt: String(expiresAt),
    signature,
    ...(input.download ? { download: "1" } : {}),
  });
  return { signedUrl: `${base.replace(/\/+$/, "")}/files/signed?${query.toString()}` };
}

/** True when a signed URL's token matches its payload and has not expired. */
export function verifySignedUrl(input: {
  bucket: string;
  path: string;
  expiresAt: number;
  signature: string;
}): boolean {
  if (!Number.isFinite(input.expiresAt) || input.expiresAt < Date.now()) return false;
  const payload = `${input.bucket}:${input.path}:${input.expiresAt}`;
  const expected = createHmac("sha256", signingSecret()).update(payload).digest("base64url");
  const a = Buffer.from(expected);
  const b = Buffer.from(input.signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Read an app-owned signed link without making an HTTP call back into the app. */
export async function readSignedObjectUrl(value: string): Promise<GetObjectResult | null> {
  const url = new URL(value);
  const base = new URL(process.env.APP_DOWNLOAD_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002");
  if (url.origin !== base.origin || url.pathname !== "/files/signed") return null;
  const input = {
    bucket: url.searchParams.get("bucket") || "",
    path: url.searchParams.get("path") || "",
    expiresAt: Number(url.searchParams.get("expiresAt")),
    signature: url.searchParams.get("signature") || "",
  };
  if (!verifySignedUrl(input)) throw new Error("The file link has expired or is invalid.");
  return getObject(input);
}

/** List local records inside one owned bucket. Never follows symbolic links. */
export async function listObjectPaths(bucket: string): Promise<string[]> {
  const root = path.dirname(resolveKey(bucket, "record"));
  async function walk(directory: string, prefix = ""): Promise<string[]> {
    let entries; try { entries = await readdir(directory, { withFileTypes: true }); } catch (error: any) { if (error.code === "ENOENT") return []; throw error; }
    const rows: string[] = [];
    for (const entry of entries) {
      const key = prefix + entry.name;
      if (entry.isDirectory()) rows.push(...await walk(path.join(directory, entry.name), key + "/"));
      else if (entry.isFile() && !entry.name.endsWith(".partial")) rows.push(key);
    }
    return rows;
  }
  return walk(root);
}

export { receiveImessage } from "./incoming-messages";
