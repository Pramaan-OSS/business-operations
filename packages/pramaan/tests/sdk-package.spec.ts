import { expect, test } from "bun:test";
import { PramaanClient, PramaanError } from "../src/index";

test("an uncertain capability start is never repeated by the package", async () => {
  let starts = 0;
  const client = new PramaanClient({ apiKey: "fake", fetch: async () => {
    starts++;
    return Response.json({ error: { code: "upstream_unavailable", message: "Unavailable", retryable: true } }, { status: 503 });
  } });
  await expect(client.call("web.search", {})).rejects.toBeInstanceOf(PramaanError);
  expect(starts).toBe(1);
});

test("rate limits keep their wait time across the package boundary", async () => {
  const client = new PramaanClient({ apiKey: "fake", fetch: async () =>
    Response.json({ error: { code: "rate_limited", message: "Wait" } }, { status: 429, headers: { "Retry-After": "7" } }) });
  await expect(client.call("web.search", {})).rejects.toMatchObject({ code: "rate_limited", retryAfterMs: 7000 });
});

test("stopping a wait cancels the accepted job without starting again", async () => {
  const paths: string[] = [];
  const controller = new AbortController();
  const client = new PramaanClient({ apiKey: "fake", fetch: async (url) => {
    const path = new URL(url).pathname;
    paths.push(path);
    return Response.json({ job_id: "owned-job", status: "cancelled" });
  } });
  controller.abort();
  expect((await client.jobs.wait("owned-job", { signal: controller.signal })).status).toBe("cancelled");
  expect(paths).toEqual(["/v1/jobs/owned-job/cancel"]);
});


test("stream refusals retain the server retry delay", async () => {
  const client = new PramaanClient({ apiKey: "fake", fetch: async () => Response.json({ error: { code: "rate_limited", retryable: true } }, { status: 429, headers: { "Retry-After": "6" } }) });
  await expect(client.llmChatStream({}).next()).rejects.toMatchObject({ code: "rate_limited", retryAfterMs: 6000 });
});

test("a read retry reservation conflict keeps the first refusal", async () => {
  let reads = 0;
  const client = new PramaanClient({ apiKey: "fake", sleep: async () => {}, fetch: async () => {
    reads++;
    return Response.json({ error: { code: reads === 1 ? "upstream_unavailable" : "conflict", retryable: true } }, { status: reads === 1 ? 503 : 409 });
  } });
  await expect(client.jobs.get("owned-job")).rejects.toMatchObject({ code: "upstream_unavailable", status: 503 });
  expect(reads).toBe(2);
});

test("a successful read clears earlier retry metadata before decoding", async () => {
  let reads = 0;
  const client = new PramaanClient({ apiKey: "fake", sleep: async () => {}, fetch: async () => ++reads === 1
    ? Response.json({ error: { code: "upstream_unavailable", retryable: true } }, { status: 503 })
    : Response.json({}) });
  await expect(client.jobs.get("owned-job")).rejects.toMatchObject({ code: "internal" });
  expect(reads).toBe(2);
});
