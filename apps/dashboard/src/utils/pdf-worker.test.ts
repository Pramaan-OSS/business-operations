import { expect, test } from "bun:test";
import { createRequire } from "node:module";

// The browser worker speaks the exact protocol version used by the reader.
test("the bundled PDF worker matches the reader dependency", () => {
  const dashboard = createRequire(new URL("../../package.json", import.meta.url));
  const reader = dashboard("react-pdf/package.json") as { dependencies: { "pdfjs-dist": string } };
  const worker = dashboard("pdfjs-dist/package.json") as { version: string };
  expect(worker.version).toBe(reader.dependencies["pdfjs-dist"]);
});
