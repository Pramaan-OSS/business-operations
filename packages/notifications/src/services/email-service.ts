import { emailSender } from "@business-operations/pramaan";
import { createHash } from "node:crypto";
import type { Database } from "@business-operations/db/client";
import { shouldSendNotification } from "@business-operations/db/queries";
import InsightsWeeklyEmail from "@business-operations/email/emails/insights-weekly";
import InvoiceEmail from "@business-operations/email/emails/invoice";
import InvoiceOverdueEmail from "@business-operations/email/emails/invoice-overdue";
import InvoicePaidEmail from "@business-operations/email/emails/invoice-paid";
import InvoiceReminderEmail from "@business-operations/email/emails/invoice-reminder";
import TransactionsEmail from "@business-operations/email/emails/transactions";
import TransactionsExportedEmail from "@business-operations/email/emails/transactions-exported";
import UpcomingInvoicesEmail from "@business-operations/email/emails/upcoming-invoices";
import { render } from "@business-operations/email/render";
import { sendEmail, type SendEmailInput } from "@business-operations/utils/send-email";
import type { EmailInput } from "../base";

export class EmailService {
  constructor(private db: Database, private deliver: typeof sendEmail = sendEmail) {}

  async sendBulk(emails: EmailInput[], notificationType: string) {
    if (emails.length === 0) {
      return {
        sent: 0,
        skipped: 0,
        failed: 0,
      };
    }

    const eligibleEmails = await this.#filterEligibleEmails(
      emails,
      notificationType,
    );

    if (eligibleEmails.length === 0) {
      return {
        sent: 0,
        skipped: emails.length,
        failed: 0,
      };
    }

    const emailPayloads = await Promise.all(
      eligibleEmails.map((email) => this.#buildEmailPayload(email)),
    );

    let sent = 0;
    for (const payload of emailPayloads) {
      try { await this.deliver(payload); sent++; }
      catch { throw new Error("Delivery could not be confirmed. Check before sending again."); }
    }
    return {
      sent,
      skipped: emails.length - eligibleEmails.length,
      failed: 0,
    };
  }

  async #filterEligibleEmails(emails: EmailInput[], notificationType: string) {
    const eligibleEmails = await Promise.all(
      emails.map(async (email) => {
        // For customer emails (with explicit 'to' field), always send - decision made at notification level
        if (email.to && email.to.length > 0) {
          return email;
        }

        // For team emails (no 'to' field), check user's notification settings
        const shouldSend = await shouldSendNotification(
          this.db,
          email.user.id,
          email.user.team_id,
          notificationType,
          "email",
        );

        return shouldSend ? email : null;
      }),
    );

    return eligibleEmails.filter(Boolean) as EmailInput[];
  }

  async #buildEmailPayload(email: EmailInput) {
    let html: string;
    if (email.template) {
      const template = this.#getTemplate(email.template as string);
      html = await render(template(email.data as any));
    } else {
      throw new Error(`No template found for email: ${email.template}`);
    }

    if (!email.subject) {
      throw new Error(`No subject found for email: ${email.template}`);
    }

    // Use explicit 'to' field if provided, otherwise default to user email
    const recipients = email.to || [email.user.email];

    const payload: SendEmailInput = {
      from: emailSender(email.from),
      replyTo: email.replyTo || email.user.email,
      to: recipients,
      subject: email.subject,
      html,
    };

    // Add optional fields if present
    if (email.bcc) payload.bcc = email.bcc;
    if (email.attachments) payload.attachments = email.attachments;
    if (email.idempotencyKey) payload.idempotencyKey = createHash("sha256").update(JSON.stringify([email.idempotencyKey, recipients])).digest("hex");
    if (email.replyTo) payload.replyTo = email.replyTo;
    if (email.text) payload.text = email.text;

    return payload;
  }

  #getTemplate(templateName: string) {
    const templates = {
      "invoice-overdue": InvoiceOverdueEmail,
      "invoice-paid": InvoicePaidEmail,
      invoice: InvoiceEmail,
      "invoice-reminder": InvoiceReminderEmail,
      transactions: TransactionsEmail,
      "transactions-exported": TransactionsExportedEmail,
      "upcoming-invoices": UpcomingInvoicesEmail,
      "insights-weekly": InsightsWeeklyEmail,
    };

    const template = templates[templateName as keyof typeof templates];

    if (!template) {
      throw new Error(`Unknown email template: ${templateName}`);
    }

    return template;
  }
}
