import { createHash } from "node:crypto";
import { requirePramaan, type Pramaan } from "@business-operations/pramaan";
import { getObject, putObject } from "./index";

const pending = new Map<string, Promise<NonNullable<Awaited<ReturnType<typeof getObject>>>>>();

/** Download once while the signed source works; browsers only receive our durable copy. */
export async function getCompanyLogo(
  selector: { domain: string } | { name: string },
  client?: Pramaan,
) {
  const key = `${createHash("sha256").update(JSON.stringify(selector)).digest("hex")}.png`;
  const cached = await getObject({ bucket: "logos", path: key });
  if (cached) return cached;
  const existing = pending.get(key);
  if (existing) return existing;
  const work = (async () => {
    const p = client ?? requirePramaan();
    const logo = await p.companiesLogoGet({ ...selector, format: "png", size: 256, fallback: "error" });
    const data = await p.downloadHostedFile(logo.file);
    if (logo.file.contentType !== "image/png" || !Buffer.from(data.subarray(0, 8)).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])))
      throw new Error("The logo image could not be confirmed.");
    await putObject({ bucket: "logos", path: key, data });
    // Do not persist the signed source URL or claim that placeholderAllowed proves authenticity.
    await putObject({ bucket: "logos", path: key.replace(".png", ".json"), data: JSON.stringify({ placeholderAllowed: logo.placeholderAllowed, fileId: logo.file.fileId }) });
    return { data: Buffer.from(data), contentType: "image/png" };
  })();
  pending.set(key, work);
  try { return await work; } finally { pending.delete(key); }
}
