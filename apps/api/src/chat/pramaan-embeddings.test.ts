import { expect, test } from "bun:test";
import { FakePramaan } from "@business-operations/pramaan/fake";
import { createPramaanEmbeddingModel } from "./pramaan-embeddings";
test("tool search reuses its returned space and rejects a changed space", async () => {
 let space = "owned-space";
 const fake = new FakePramaan({ "text.embed": () => ({ model: "embed-2", space, dimensions: 2, embeddings: [[1, 0]] }) });
 const model = createPramaanEmbeddingModel(fake);
 await model.doEmbed({ values: ["First"] });await model.doEmbed({ values: ["Later"] });
 expect(fake.calls[1]?.input).toEqual({ input: ["Later"], inputType: "document", space: "owned-space" });
 space = "different-space";
 await expect(model.doEmbed({ values: ["Changed"] })).rejects.toThrow("The search vector space could not be confirmed.");
});
