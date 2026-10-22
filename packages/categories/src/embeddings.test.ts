import { expect, test } from "bun:test";
import { CategoryEmbeddings } from "./embeddings";
test("offline vectors use the local column size and preserve their space for later calls", async () => {
 const old = { key: process.env.PRAMAAN_API_KEY, fake: process.env.PRAMAAN_FAKE };
 process.env.PRAMAAN_API_KEY = "offline-test"; process.env.PRAMAAN_FAKE = "1";
 try {
  const service = new CategoryEmbeddings();const first = await service.embed("Office supplies");
  expect(first.embedding).toHaveLength(1024);expect(first.space).toBe("demo-space");
  const later = await service.embedMany(["Office equipment"], first.space);
  expect(later.space).toBe(first.space);expect(later.embeddings[0]).toHaveLength(1024);
 } finally { if (old.key === undefined) delete process.env.PRAMAAN_API_KEY; else process.env.PRAMAAN_API_KEY = old.key; if (old.fake === undefined) delete process.env.PRAMAAN_FAKE; else process.env.PRAMAAN_FAKE = old.fake; }
});
