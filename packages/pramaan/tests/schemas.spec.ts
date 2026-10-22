import { describe, expect, test } from "bun:test";
import {
  assertBoundedJsonSchema,
  normalizeGenerationSchemas,
  validateGenerationSchemas,
} from "../src/json-schema";
import {
  ASSISTANT_TOOLS,
  DOCUMENT_CLASSIFY_SCHEMA,
  ROUTING_SCHEMA,
  TAX_RATE_SCHEMA,
  TRANSACTION_ENRICH_SCHEMA,
} from "../src/schemas";

const ALL_SCHEMAS: ReadonlyArray<{ name: string; schema: Record<string, unknown> }> = [
  { name: "ROUTING_SCHEMA", schema: ROUTING_SCHEMA },
  { name: "TAX_RATE_SCHEMA", schema: TAX_RATE_SCHEMA },
  { name: "TRANSACTION_ENRICH_SCHEMA", schema: TRANSACTION_ENRICH_SCHEMA },
  { name: "DOCUMENT_CLASSIFY_SCHEMA", schema: DOCUMENT_CLASSIFY_SCHEMA },
];

describe("generation schemas", () => {
  test("every schema this product sends fits the bounded subset", () => {
    for (const { name, schema } of ALL_SCHEMAS) {
      expect(() => assertBoundedJsonSchema(schema, name)).not.toThrow();
    }
    for (const tool of ASSISTANT_TOOLS) {
      expect(() => assertBoundedJsonSchema(tool.parameters, tool.name)).not.toThrow();
    }
  });

  test("schemas survive normalize without loss", () => {
    for (const { schema } of ALL_SCHEMAS) {
      const normalized = normalizeGenerationSchemas({
        messages: [{ role: "user", content: "x" }],
        maxTokens: 64,
        jsonSchema: schema,
      });
      expect(() => validateGenerationSchemas(normalized)).not.toThrow();
    }
  });

  test("schemas the service refuses fail here first", () => {
    const bad = {
      type: "object",
      $schema: "https://json-schema.org/draft/2020-12/schema",
      properties: { a: { type: "string", pattern: ".*" } },
      required: ["a"],
      additionalProperties: false,
    };
    expect(() => assertBoundedJsonSchema(bad)).toThrow();
    const externalRef = { type: "object", properties: { a: { $ref: "https://elsewhere.test/x" } }, required: ["a"] };
    expect(() => assertBoundedJsonSchema(externalRef)).toThrow();
  });
});
