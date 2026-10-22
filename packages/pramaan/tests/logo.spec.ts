import { expect, test } from "bun:test";
import { createPramaan, validateLogoResult } from "../src/index";
import { FakePramaan } from "../src/fake";

const id = `file_${"0".repeat(26)}`;
const logo = () => ({ file: { fileId: id, url: `https://api.pramaan.dev/files/${id}?s=signed`, expiresAt: "2099-01-01T00:00:00Z", contentType: "image/png", sizeBytes: 8 }, placeholderAllowed: true, sourceFormat: "svg", sourceIsVector: true });

test("real and fake helpers accept the same hosted logo contract", async () => {
  const result = logo();
  const fake = new FakePramaan({ "companies.logo.get": () => result });
  expect(await fake.companiesLogoGet({ domain: "example.test" })).toEqual(result);
  expect(validateLogoResult(result).placeholderAllowed).toBe(true);
  for (const invalid of [ {}, { ...result, placeholderAllowed: "true" }, { ...result, sourceFormat: "html" }, { ...result, file: { ...result.file, expiresAt: "never" } }, { ...result, file: { ...result.file, sizeBytes: 11 * 1024 * 1024 } } ]) {
    fake.route({ "companies.logo.get": () => invalid });
    await expect(fake.companiesLogoGet({ domain: "example.test" })).rejects.toThrow("confirm the logo");
  }
});

test("downloads only bounded files on the configured host and never sends the key", async () => {
  const calls: string[] = [];
  const client = createPramaan({ apiKey: "fake", fetch: async (url, init) => {
    calls.push(String(url));
    expect(new Headers(init?.headers).has("Authorization")).toBe(false);
    expect(init?.redirect).toBe("error");
    return new Response(new Uint8Array(8));
  } });
  expect((await client.downloadHostedFile(logo().file)).length).toBe(8);
  for (const file of [
    { ...logo().file, url: "https://example.test/private" },
    { ...logo().file, expiresAt: "2000-01-01T00:00:00Z" },
    { ...logo().file, url: "https://api.pramaan.dev/other" },
  ]) await expect(client.downloadHostedFile(file)).rejects.toThrow("invalid or has expired");
  expect(calls).toHaveLength(1);
  await expect(client.downloadHostedFile({ ...logo().file, sizeBytes: 1 })).rejects.toThrow("too large");
});

test("logo retrieval decodes the 202 and validates the finished job result", async () => {
  const paths: string[] = [];
  const result = logo();
  const client = createPramaan({ apiKey: "fake", fetch: async url => {
    const path = new URL(String(url)).pathname;
    paths.push(path);
    return path.startsWith("/v1/jobs/")
      ? Response.json({ job_id: "logo1", status: "done", result })
      : Response.json({ job_id: "logo1", status: "running" }, { status: 202 });
  } });
  expect(await client.companiesLogoGet({ domain: "example.test" })).toEqual(result);
  expect(paths).toEqual(["/v1/capabilities/companies.logo.get", "/v1/jobs/logo1"]);
});
