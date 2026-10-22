import { expect, test } from "bun:test";
import { createPramaanModel } from "./pramaan-model";
test("a completed non-streamed reply reaches the chat text stream", async () => {
 const old = { key: process.env.PRAMAAN_API_KEY, fake: process.env.PRAMAAN_FAKE };
 process.env.PRAMAAN_API_KEY = "offline-test"; process.env.PRAMAAN_FAKE = "1";
 try {
  const response = await createPramaanModel().doStream({ prompt: [{ role: "user", content: [{ type: "text", text: "Hello" }] }], maxOutputTokens: 256 });
  const reader = response.stream.getReader();const parts = [];
  for (;;) { const next = await reader.read();if (next.done) break;parts.push(next.value); }
  expect(parts.find(part => part.type === "text-delta")).toMatchObject({ delta: "This is an offline demonstration. Connect a real key to use this feature." });
  expect(parts.find(part => part.type === "finish")).toMatchObject({ finishReason: "stop" });
 } finally { if (old.key === undefined) delete process.env.PRAMAAN_API_KEY; else process.env.PRAMAAN_API_KEY = old.key; if (old.fake === undefined) delete process.env.PRAMAAN_FAKE; else process.env.PRAMAAN_FAKE = old.fake; }
});
