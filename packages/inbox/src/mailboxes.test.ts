import { expect, test } from "bun:test";
import { FakePramaan } from "@business-operations/pramaan/fake";
import { Mailboxes } from "./mailboxes";

test("mailbox imports verify ownership, message identity and complete attachment bytes", async () => {
  const ref = `ref_${"0".repeat(26)}`;
  const summary = { messageId: "<one@example.test>", inbox: "inbox@example.test", from: "sender@example.test", to: ["inbox@example.test"], attachments: [{ attachmentId: "attachment", size: 3, contentType: "application/pdf" }] };
  const fake = new FakePramaan({
    "email.accounts.list": input => ({ results: (input as { endUserRef: string }).endUserRef === "team.one" ? [{ ref, inbox: summary.inbox, status: "active" }] : [] }),
    "email.messages.list": () => ({ results: [summary] }),
    "email.message.get": () => ({ ...summary, text: "Receipt" }),
    "email.attachment.get": () => ({ size: 3, content: "YWJj", filename: "receipt.pdf", mimeType: "application/pdf" }),
    "email.account.disconnect": () => ({ disconnected: true }),
  });
  const mailboxes = new Mailboxes(fake);
  await expect(mailboxes.attachments("team.two", summary.inbox)).rejects.toThrow("not found");
  expect(fake.callsTo("email.messages.list")).toHaveLength(0);
  const files = await mailboxes.attachments("team.one", summary.inbox);
  expect(files[0]?.data.toString()).toBe("abc");
  expect(files[0]?.referenceId).toBe((await mailboxes.attachments("team.one", summary.inbox))[0]?.referenceId);
  fake.route({ "email.attachment.get": () => ({ size: 4, content: "YWJj" }) });
  await expect(mailboxes.attachments("team.one", summary.inbox)).rejects.toThrow("incomplete");
  fake.route({ "email.message.get": () => ({ ...summary, text: "Receipt", inbox: "other@example.test" }) });
  await expect(mailboxes.attachments("team.one", summary.inbox)).rejects.toThrow("confirmed");
  await expect(mailboxes.disconnect("team.two", summary.inbox)).rejects.toThrow("not found");
  expect(await mailboxes.disconnect("team.one", summary.inbox)).toEqual({ disconnected: true });
});
