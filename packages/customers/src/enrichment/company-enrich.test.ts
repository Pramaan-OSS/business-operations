import { expect, test } from "bun:test";
import { FakePramaan } from "@business-operations/pramaan/fake";
import { PramaanError } from "@business-operations/pramaan";
import { lookupCompany, mapToSchema } from "./company-enrich";

test("looks up only the documented domain selector and maps supported fields", async () => {
  const client = new FakePramaan({ "companies.enrich": () => ({ name: "Example", domain: "example.test", description: "Tools", employeeCount: 21, industry: "Software", location: { city: "London", region: "England", country: "GB" } }) });
  const result = await lookupCompany("Example", "example.test", { client });
  expect(client.callsTo("companies.enrich")).toEqual([{ domain: "example.test" }]);
  expect(result?.matchedByDomain).toBe(true);
  expect(mapToSchema(result!.data)).toMatchObject({ industry: "Software", employeeCount: "11-50", city: "London", state: "England", timezone: "Europe/London", estimatedRevenue: null, totalFunding: null, addressLine1: null });
});

test("name lookup has no claimed domain match", async () => {
  const client = new FakePramaan({ "companies.enrich": () => ({ name: "Example" }) });
  expect((await lookupCompany("Example", null, { client }))?.matchedByDomain).toBe(false);
  expect(client.callsTo("companies.enrich")).toEqual([{ name: "Example" }]);
});

test("missing company returns null but an unavailable capability stays an error", async () => {
  const client = new FakePramaan({ "companies.enrich": () => { throw new PramaanError("not_found", "missing"); } });
  expect(await lookupCompany("Example", null, { client })).toBeNull();
  client.route({ "companies.enrich": () => { throw new PramaanError("upstream_unavailable", "private"); } });
  await expect(lookupCompany("Example", null, { client })).rejects.toMatchObject({ code: "upstream_unavailable" });
});

test("cancellation stops waiting on a pending company request", async () => {
  const controller = new AbortController();
  const client = new FakePramaan({ "companies.enrich": () => new Promise(() => {}) });
  const result = lookupCompany("Example", null, { client, signal: controller.signal });
  controller.abort();
  await expect(result).rejects.toThrow("cancelled or timed out");
});
