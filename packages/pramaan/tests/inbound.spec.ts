import { expect, test } from "bun:test";
import { FakePramaan } from "../src/fake";
import { PramaanError, unavailableMessage } from "../src/index";
import { demoFetch } from "../src/demo-transport";
const message = { ref: `ref_${"7".repeat(26)}`, receivedAt: "2026-10-26T12:00:00Z", text: "Incoming" };
for (const id of ["apps.action.read", "whatsapp.inbound-messages.list"] as const) {
  const input = id === "apps.action.read" ? { endUserRef: "team.user", action: "SLACK_FETCH_CONVERSATION_HISTORY", input: { channel: "room" } } : { connectionRef: "sender" };
  test(`${id}: success, malformed result, refusal and unavailable`, async () => {
    const fake = new FakePramaan({ [id]: () => ({ messages: [{ ...message, ...(id === "apps.action.read" ? { sender: "Person" } : { from: "+447700900001" }) }], nextCursor: "checkpoint" }) });
    expect(await fake.call(id, input)).toHaveProperty("nextCursor", "checkpoint");
    fake.route({ [id]: () => ({ messages: [{ text: "Missing identity" }] }) });
    await expect(fake.call(id, input)).rejects.toThrow("could not be confirmed");
    for (const code of ["invalid_request", "not_found"] as const) {
      fake.route({ [id]: () => { throw new PramaanError(code, "Refused"); } });
      try { await fake.call(id, input); throw new Error("Expected refusal"); } catch (error) { expect(error).toBeInstanceOf(PramaanError); if (code === "not_found") expect(unavailableMessage(error)).toContain("not available yet"); }
    }
    const old = process.env.PRAMAAN_FAKE_INBOUND;
    try {
      for (const [mode, status] of [["unavailable", 404], ["refused", 400], ["", 200]] as const) {
        process.env.PRAMAAN_FAKE_INBOUND = mode;
        const response = await demoFetch(`https://offline.test/v1/capabilities/${id}`, { method: "POST", body: JSON.stringify(input) });
        expect(response.status).toBe(status);
      }
    } finally { if (old === undefined) delete process.env.PRAMAAN_FAKE_INBOUND; else process.env.PRAMAAN_FAKE_INBOUND = old; }
  });
}
