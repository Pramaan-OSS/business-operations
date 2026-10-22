import { expect, test } from "bun:test";
import type { Database } from "@business-operations/db/client";
import type { SendEmailInput } from "@business-operations/utils/send-email";
import type { EmailInput } from "../base";
import { EmailService } from "./email-service";
const email = (recipient: string): EmailInput => ({ user: { id: "user", team_id: "team", email: recipient }, from: "Business <mail@example.test>", to: [recipient], template: "invoice", subject: "Invoice", data: {}, idempotencyKey: "owned-delivery-request" });
test("unconfirmed delivery throws and stops before sending the next recipient", async () => {
 let attempts = 0;
 const service = new EmailService({} as Database, async () => { attempts++; throw new Error("Timeout"); });
 await expect(service.sendBulk([email("one@example.test"), email("two@example.test")], "invoice_sent")).rejects.toThrow("Check before sending again");
 expect(attempts).toBe(1);
});
test("delivery keys stay stable for a recipient and differ across recipients", async () => {
 const delivered: SendEmailInput[] = [];
 const service = new EmailService({} as Database, async input => { delivered.push(input); return { messageId: "accepted" }; });
 await service.sendBulk([email("one@example.test"), email("two@example.test")], "invoice_sent");
 await service.sendBulk([email("one@example.test")], "invoice_sent");
 expect(delivered[0]?.idempotencyKey).toBe(delivered[2]?.idempotencyKey);
 expect(delivered[0]?.idempotencyKey).not.toBe(delivered[1]?.idempotencyKey);
});
