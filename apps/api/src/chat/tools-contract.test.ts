import { expect, test } from "bun:test";
import { toAgentTool } from "./tools";
import { assertBoundedJsonSchema } from "@business-operations/pramaan";
test("unsupported action constraints remain in the local contract instead of breaking chat", async () => {
 const calls: unknown[] = [];
 const client = { callTool: async (request: unknown) => { calls.push(request);return { structuredContent: { accepted: true } }; } };
 const wrapped = toAgentTool({ name: "owned_action", inputSchema: { type: "object", properties: { id: { type: "string", pattern: "^owned-" } }, required: ["id"] } }, client as any);
 const schema = (wrapped.inputSchema as any).jsonSchema;
 assertBoundedJsonSchema(schema);
 expect((schema.properties as any).arguments.description).toContain('"pattern":"^owned-"');
 await (wrapped.execute as any)({ arguments: '{"id":"owned-example"}' }, {});
 expect(calls).toEqual([{ name: "owned_action", arguments: { id: "owned-example" } }]);
 await expect((wrapped.execute as any)({ arguments: '[]' }, {})).rejects.toThrow("Check the action input.");
 expect(calls).toHaveLength(1);
});
