import { expect, test } from "bun:test";
import { FakePramaan } from "./fake";
import { createPramaan } from "./index";

test("live and fake clients refuse embeddings without an input type before calling", async () => {
  const fake = new FakePramaan({ "text.embed": () => { throw new Error("must not call"); } });
  let sent = false;
  const live = createPramaan({ apiKey: "offline", fetch: async () => { sent = true; throw new Error("must not call"); } });
  for (const client of [fake, live]) {
    await expect(client.call("text.embed", { input: ["Office supplies"] })).rejects.toThrow("query or document");
  }
  expect(fake.calls).toHaveLength(0);
  expect(sent).toBe(false);
});

test("the fake accepts both embedding input types", async () => {
  const fake = new FakePramaan({ "text.embed": () => ({ embeddings: [[1]], dimensions: 1, model: "test", space: "test" }) });
  for (const inputType of ["query", "document"] as const) {
    await fake.textEmbed({ input: ["Office supplies"], inputType });
  }
  expect(fake.calls).toHaveLength(2);
});
