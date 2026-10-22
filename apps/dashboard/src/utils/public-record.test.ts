import { expect, test } from "bun:test";
import { readPublicRecord } from "./public-record";
test("a missing invoice returns the page's not-found state", async () => {
  expect(await readPublicRecord(async () => { throw { data: { code: "NOT_FOUND" } }; })).toBeNull();
});
test("an existing invoice is preserved and unexpected failures still surface", async () => {
  expect(await readPublicRecord(async () => ({ id: "invoice" }))).toEqual({ id: "invoice" });
  await expect(readPublicRecord(async () => { throw new Error("database unavailable"); })).rejects.toThrow("database unavailable");
});
