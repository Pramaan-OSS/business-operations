import { expect, test } from "bun:test";
import { FakePramaan } from "../src/fake";
import { pramaanFromEnv } from "../src/index";
import { validateImessageResult } from "../src/imessage";
const input = { sender: "+447700900000", contact: "+447700900001", waitSeconds: 20 };
const message = { rowRef: "ref_00000000000000000000000000", direction: "inbound", kind: "text", text: "Private content", contact: input.contact, channel: "imessage", createdAt: "2026-10-15T12:00:00Z" };
test("fake validates empty windows, messages and request bounds without sending", async () => {
 const fake = new FakePramaan({ "imessage.message.receive": () => ({ found: false }) });
 expect(await fake.imessageMessageReceive(input)).toEqual({ found: false });
 fake.route({ "imessage.message.receive": () => ({ found: true, message }) });
 expect((await fake.imessageMessageReceive(input)).message?.text).toBe("Private content");
 await expect(fake.imessageMessageReceive({ ...input, waitSeconds: 901 })).rejects.toThrow();
 expect(fake.calls.every(call => call.id === "imessage.message.receive")).toBe(true);
});
test("rejects contradictions, invalid metadata and too many attachments without exposing content", () => {
 for (const value of [{ found: true }, { found: false, message }, { found: true, message: { ...message, direction: "other" } }, { found: true, message: { ...message, kind: ["text"] } }, { found: true, message: { ...message, createdAt: "yesterday" } }, { found: true, message: { ...message, files: Array(4).fill({}) } }]) {
  expect(() => validateImessageResult(value)).toThrow("The incoming message could not be confirmed.");
 }
});
test("offline transport starts and polls the asynchronous job", async () => {
 const old = { key: process.env.PRAMAAN_API_KEY, fake: process.env.PRAMAAN_FAKE };
 process.env.PRAMAAN_API_KEY = "offline-test"; process.env.PRAMAAN_FAKE = "1";
 try { const result = await pramaanFromEnv()!.imessageMessageReceive(input); expect(result.found).toBe(true); expect(result.message?.direction).toBe("inbound"); }
 finally { if (old.key === undefined) delete process.env.PRAMAAN_API_KEY; else process.env.PRAMAAN_API_KEY = old.key; if (old.fake === undefined) delete process.env.PRAMAAN_FAKE; else process.env.PRAMAAN_FAKE = old.fake; }
});
