import type { Database } from "@business-operations/db/client";
import { createLoggerWithContext } from "@business-operations/logger";
export type ProviderNotificationType =
  | "transaction"
  | "match"
  | "invoice_paid"
  | "invoice_overdue"
  | "recurring_invoice_upcoming";

export type TransactionPayload = {
  transactions: Array<{
    id: string;
    name: string;
    amount: number;
    currency: string;
    date: string;
  }>;
};

export type MatchPayload = {
  inboxId: string;
  transactionId: string;
  documentName: string;
  documentAmount: number;
  documentCurrency: string;
  documentDate?: string;
  transactionName: string;
  transactionAmount: number;
  transactionCurrency: string;
  transactionDate?: string;
  confidenceScore: number;
  matchType: "auto_matched" | "high_confidence" | "suggested";
};

export type InvoicePaidPayload = {
  invoiceId: string;
  invoiceNumber: string;
  customerName?: string;
  paidAt?: string;
};

export type InvoiceOverduePayload = {
  invoiceId: string;
  invoiceNumber: string;
  customerName: string;
};

export type RecurringInvoiceUpcomingPayload = {
  invoices: Array<{
    recurringId: string;
    customerName?: string;
    amount?: number;
    currency?: string;
    scheduledAt: string;
    frequency?: string | null;
  }>;
  count: number;
};

type ProviderPayload = {
  transaction: TransactionPayload;
  match: MatchPayload;
  invoice_paid: InvoicePaidPayload;
  invoice_overdue: InvoiceOverduePayload;
  recurring_invoice_upcoming: RecurringInvoiceUpcomingPayload;
};


export type NotificationContext = {
  eventType: ProviderNotificationType;
  teamId: string;
  userId: string;
  entityType: string;
  entityIds: string[];
  summary: string;
  sourcePlatform: "slack" | "telegram" | "whatsapp" | "sms" | "imessage";
  sourceMessageId?: string;
  suggestedPrompts: string[];
  sentAt: string;
};

export type SendToProvidersOptions = {
  inboxMeta?: {
    source?: string;
    sourceMetadata?: {
      channelId?: string;
      threadTs?: string;
      messageTs?: string;
      phoneNumber?: string;
      externalUserId?: string;
    };
  };
};


const logger = createLoggerWithContext("channel-notifications");
/** Activity remains in the app; external delivery requires review on the Channels page. */
export async function sendToProviders<T extends ProviderNotificationType>(_db: Database, teamId: string, type: T, _payload: ProviderPayload[T], _options?: SendToProvidersOptions): Promise<void> {
  logger.info("External channel delivery requires approval in Channels", { teamId, eventType: type });
}
export async function flushDueActivityNotificationBatches(_db: Database) {
  return { skipped: true, reason: "External channel delivery requires approval in Channels." };
}
export function formatNotificationContextForPrompt(context: NotificationContext) { return context.summary; }
