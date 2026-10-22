import { expect, test } from "bun:test";
import { FakePramaan } from "./fake";
import { embedInSpace } from "./embedding-batch";
test("large embedding requests fit the response size cap and preserve order and space", async () => {
 const p = new FakePramaan({ "text.embed": input => {
  const value = input as { input: string[]; space?: string };
  if (value.input.length > 16) throw new Error("This source cannot fit that many vectors in one response; use fewer inputs.");
  return { model: "fixed", space: value.space || "owned", dimensions: 1, embeddings: value.input.map(Number).map(n => [n]), usage: { inputTokens: value.input.length } };
 } });
 const result = await embedInSpace(p, { input: Array.from({ length: 35 }, (_, n) => String(n)), inputType: "document" });
 expect(p.calls.map(call => (call.input as { input: string[] }).input.length)).toEqual([16, 16, 3]);
 expect(p.calls.slice(1).every(call => (call.input as { space: string }).space === "owned")).toBe(true);
 expect(result.embeddings.map(row => row[0])).toEqual(Array.from({ length: 35 }, (_, n) => n));
 expect(result.usage?.inputTokens).toBe(35);
});
test("a changed space never returns a mixed batch", async () => {
 let count = 0;
 const p = new FakePramaan({ "text.embed": input => ({ model: "fixed", space: ++count === 1 ? "owned" : "changed", dimensions: 1, embeddings: (input as {input:string[]}).input.map(() => [1]) }) });
 await expect(embedInSpace(p, { input: Array(17).fill("text"), inputType: "document" })).rejects.toThrow("space could not be confirmed");
});
