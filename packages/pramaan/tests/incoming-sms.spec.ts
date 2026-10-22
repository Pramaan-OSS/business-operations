import { expect, test } from "bun:test";
import { FakePramaan } from "../src/fake";
test("incoming SMS reads validate the same shape in the fake", async () => {
 const good = new FakePramaan({ "sms.inbound-messages.list": () => ({ results: [{ from: "+447700900001", to: "+447700900000", contentType: "text", body: "Receipt uploaded", receivedAt: "2026-10-15T12:00:00Z" }] }) });
 expect((await good.smsInboundMessagesList({ to: "+447700900000" })).results[0]?.body).toBe("Receipt uploaded");
 expect(good.calls).toHaveLength(1);
 const invalid = new FakePramaan({ "sms.inbound-messages.list": () => ({ results: [{ body: "Missing sender and time" }] }) });
 await expect(invalid.smsInboundMessagesList({})).rejects.toThrow();
});
