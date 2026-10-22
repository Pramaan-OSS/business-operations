// Requests and results for the capabilities this product calls. Shapes follow the
// platform's capability contracts; only the fields this product uses are kept.
// `llm.chat` / `llm.complete` take `messages` (never a bare prompt) and a
// `maxTokens` of 64 or more; tool `parameters` / `jsonSchema` must fit the
// bounded subset enforced in json-schema.ts.

import type { JsonObject } from "./json";

export type Message = {
  readonly role: "system" | "user" | "assistant" | "tool";
  readonly content: string;
  readonly toolCallId?: string;
  readonly name?: string;
};

export type ToolDef = {
  readonly name: string;
  readonly description?: string;
  /** Bounded-subset JSON Schema; root must be an object. */
  readonly parameters: Record<string, unknown>;
};

export namespace Caps {
  export interface LlmRequest {
    readonly messages: ReadonlyArray<Message>;
    /** 64 or more. */
    readonly maxTokens?: number;
    readonly tools?: ReadonlyArray<ToolDef>;
    readonly jsonSchema?: Record<string, unknown>;
  }
  export interface LlmResult {
    readonly text?: string;
    readonly finishReason?: string;
    readonly usage?: { readonly inputTokens: number; readonly outputTokens: number };
    readonly toolCalls?: ReadonlyArray<{
      readonly id: string;
      readonly name: string;
      readonly arguments: JsonObject;
    }>;
  }

  // email.send contract adopted from lab e0922353.
  export interface EmailSendRequest {
    readonly to: ReadonlyArray<string>;
    readonly subject: string;
    readonly text?: string;
    readonly html?: string;
    readonly from: string;
    readonly cc?: string | ReadonlyArray<string>;
    readonly bcc?: string | ReadonlyArray<string>;
    readonly replyTo?: string;
    /** At most 10 uploaded files, 6 MB combined. */
    readonly attachments?: ReadonlyArray<{ fileId: string; name: string }>;
    readonly invitation?: {
      readonly uid: string;
      readonly title: string;
      readonly start: string;
      readonly end: string;
      readonly timeZone: string;
      readonly organiser: string;
      readonly attendees: ReadonlyArray<string>;
      readonly location?: string;
      readonly description?: string;
      readonly method: "request" | "cancel";
      readonly sequence?: number;
    };
  }
  export interface EmailSendResult {
    readonly ref?: string;
    readonly id?: string;
    readonly status?: string;
  }

  export interface EmailTemplateSendRequest {
    readonly ref: string;
    readonly from: { email: string; name?: string };
    readonly to: { email: string; name?: string };
    readonly cc?: ReadonlyArray<{ email: string; name?: string }>;
    readonly bcc?: ReadonlyArray<{ email: string; name?: string }>;
    readonly replyTo?: ReadonlyArray<{ email: string; name?: string }>;
    readonly variables?: Readonly<Record<string, string>>;
    readonly attachments?: ReadonlyArray<{ fileId: string; name: string }>;
    readonly autoSubmitted?: "auto-generated" | "auto-replied";
  }

  export interface SmsSendRequest {
    readonly to: string;
    readonly body: string;
    readonly from?: string;
  }
  export interface SmsSendResult {
    readonly ref?: string;
    readonly id?: string;
    readonly status?: string;
  }

  // Connected apps (the person's own third-party accounts).
  export interface AppsCatalogSearchRequest {
    readonly app?: string;
    readonly query: string;
    readonly cursor?: string;
    readonly limit?: number;
  }
  export interface AppsCatalogSearchResult {
    readonly results: ReadonlyArray<{ app: string; action: string; readOnly?: true; description?: string; inputSchema?: unknown }>;
    readonly nextCursor?: string | null;
  }
  export interface AppsConnectionStartResult { readonly connectUrl: string; readonly expiresAt?: string }
  export interface AppsConnectionsListResult {
    readonly results: ReadonlyArray<{ app: string; status: "active" | "pending" | "failed" | "expired" | "disabled" | "revoked"; connectedAt?: string; access?: "read" | "read-write" | "full" | "limited"; accessConfirmed?: true }>;
    readonly nextCursor?: string;
  }
  export interface AppsActionExecuteResult { readonly status: "succeeded" | "failed"; readonly output: unknown; readonly error?: string; readonly truncated?: true }
  export interface AppsConnectionStartRequest {
    readonly app: string;
    readonly endUserRef: string;
    readonly redirectUrl: string;
    readonly access?: "read" | "read-write";
  }
  export interface AppsConnectionsListRequest {
    readonly endUserRef: string;
    readonly app?: string;
  }
  export interface AppsActionExecuteRequest {
    readonly action: string;
    readonly endUserRef: string;
    readonly input: JsonObject;
  }

  export type BankingInstitutionsSearchRequest = import("./banking-contracts").BankingInstitutionsSearchRequest;
  export type BankingInstitution = import("./banking-contracts").BankingInstitutionGetResult;
  export type BankingConnectionStartRequest = import("./banking-contracts").BankingConnectionStartRequest;
  export type BankingConnectionStartResult = import("./banking-contracts").BankingConnectionStartResult;
  export type BankingConnectionStatusRequest = import("./banking-contracts").BankingConnectionStatusRequest;
  export type BankingAccount = import("./banking-contracts").BankingAccountsListResult["accounts"][number];
  export type BankingTransactionRow = import("./banking-contracts").BankingTransactionsListResult["transactions"][number];
  export type BankingTransactionsSyncRequest = import("./banking-contracts").BankingTransactionsSyncRequest;
  export type BankingTransactionsListRequest = import("./banking-contracts").BankingTransactionsListRequest;

  // Merchant and company facts.
  export interface BrandFromTransactionRequest {
    readonly descriptor: string;
    readonly country?: string;
    readonly city?: string;
    readonly mcc?: string | number;
    readonly highConfidenceOnly?: boolean;
  }
  export interface BrandFromTransactionResult {
    readonly name?: string;
    readonly domain?: string;
    readonly logoUrl?: string;
    readonly [key: string]: unknown;
  }
  export interface CompaniesLogoGetRequest {
    readonly domain?: string;
    readonly name?: string;
    readonly size?: number;
    readonly format?: "png" | "jpg" | "webp";
    readonly fallback?: "error" | "monogram";
  }
  export interface CompaniesEnrichRequest {
    readonly domain?: string;
    readonly name?: string;
  }

  // Documents.
  export interface DocumentParseRequest {
    /** Public URL or base64 content of the document. */
    readonly url?: string;
    readonly content?: string;
    readonly contentType?: string;
    readonly [key: string]: unknown;
  }
  export interface DocumentExtractRequest extends DocumentParseRequest {
    readonly schema?: Record<string, unknown>;
  }

  // Finance.
  export interface ExchangeRateGetRequest {
    readonly from: string;
    readonly to: string;
  }
  export interface ExchangeRateGetResult {
    readonly rate: number;
    readonly from?: string;
    readonly to?: string;
    readonly date?: string;
  }
  export interface CurrencyConvertRequest {
    readonly amount: number;
    readonly from: string;
    readonly to: string;
  }
  export interface CurrencyConvertResult {
    readonly amount: number;
    readonly rate?: number;
    readonly from?: string;
    readonly to?: string;
  }
  export interface TaxRatesGetRequest {
    /** ISO 2-letter country code. */
    readonly countryCode: string;
  }
  export interface VatNumberValidateRequest {
    readonly vatNumber: string;
    readonly countryCode?: string;
  }

  // Places.
  export interface GeoAddressSuggestRequest { readonly countryCode: string; readonly text: string; readonly limit?: number }
  export interface GeoAddressSuggestResult { readonly results: ReadonlyArray<{ text: string; entries: number; ref?: string; components?: { street?: string; locality?: string; region?: string; postalCode?: string; countryCode?: string } }> }
  export interface GeoAddressDetailedResult { readonly results: ReadonlyArray<{ formattedAddress: string; location: { latitude: number; longitude: number }; components?: ReadonlyArray<{ longText: string; shortText?: string; types: readonly string[] }> }> }

  // Payments: invoice payment links and hosted checkout (operator's account).
  export type PaymentTaxCategory = "digital_products" | "saas" | "e_book" | "edtech" | "live_tutoring";
  export interface PaymentLinkCreateRequest {
    readonly taxCategory?: PaymentTaxCategory;
    readonly notifyEmail?: boolean;
    readonly notifySms?: boolean;
    readonly reminders?: boolean;
    readonly amount: number;
    readonly currency: string;
    readonly description?: string;
    readonly reference?: string;
    readonly allowPartial?: boolean;
    readonly customer?: { readonly email?: string; readonly name?: string };
  }
  export interface PaymentLinkResult {
    readonly ref?: string;
    readonly paymentLinkId: string;
    readonly paymentUrl?: string;
    readonly linkExpiresAt?: string;
    readonly status: "created" | "partially_paid" | "paid" | "expired" | "canceled" | "unknown";
    readonly payments?: ReadonlyArray<{ readonly ref: string; readonly amount: { readonly amount: number; readonly currency: string } }>;
    readonly amount?: { readonly amount: number; readonly currency: string };
    readonly amountPaid?: { readonly amount: number; readonly currency: string };
  }
  export interface PaymentLinkGetRequest {
    readonly ref?: string;
    readonly paymentLinkId?: string;
  }
  export interface CheckoutCreateRequest {
    readonly lineItems: ReadonlyArray<{ readonly name: string; readonly amount: number; readonly currency: string; readonly quantity?: number }>;
    readonly successUrl: string;
    readonly cancelUrl: string;
    readonly mode?: "payment";
    readonly customerEmail?: string;
  }
  export interface CheckoutCreateResult {
    readonly ref?: string;
    readonly checkoutUrl: string;
    readonly expiresAt?: string;
  }
  export interface CheckoutGetRequest {
    readonly ref?: string;
    readonly checkoutId?: string;
    readonly sessionResult?: string;
  }

  // Messaging channels.
  export interface NotifyMessageSendRequest {
    readonly subscriberId: string;
    readonly channel: "push" | "inbox" | "email" | "sms";
    readonly title?: string;
    readonly body: string;
    readonly data?: Readonly<Record<string, string>>;
  }
  export interface ChatMessagesListRequest {
    readonly channelId: string;
    readonly kind?: "group" | "open";
    readonly limit?: number;
    readonly cursor?: string;
    readonly direction?: "older" | "newer";
  }
  export interface ChatMessageRow {
    readonly messageId: string;
    readonly channelId: string;
    readonly kind?: "text" | "file" | "admin";
    readonly text?: string;
    readonly senderId?: string;
    readonly senderName?: string;
    readonly createdAt?: string;
  }
  export interface ImessageSendRequest {
    readonly sender: string;
    readonly recipient: string;
    readonly text: string;
  }
  export interface ImessageReceiveRequest {
    readonly sender: string;
    readonly contact: string;
    readonly after?: string;
    readonly waitSeconds?: number;
  }
}

export type TextEmbedRequest = {
  /** The texts to embed, 1 to 96; vectors come back in this order. */
  readonly input: ReadonlyArray<string>;
  readonly dimensions?: number;
  readonly space?: string;
  readonly inputType: "query" | "document";
  readonly [key: string]: unknown;
};
export type TextEmbedResult = {
  readonly model: string;
  /** Opaque vector-space id; store next to the vectors and send back later. */
  readonly space: string;
  readonly dimensions: number;
  /** One vector per input text, in input order. */
  readonly embeddings: ReadonlyArray<ReadonlyArray<number>>;
  readonly usage?: { readonly inputTokens: number };
};
export type WebSearchRequest = {
  readonly query: string;
  readonly limit?: number;
  readonly [key: string]: unknown;
};
export type WebSearchResult = {
  readonly results?: ReadonlyArray<JsonObject>;
  readonly [key: string]: unknown;
};

export namespace Caps {
 export type SmsInboundMessagesListRequest = { limit?: number; cursor?: string; startDate?: string; endDate?: string; to?: string };
 export type SmsInboundMessagesListResult = { results: { ref?: string; from: string; to: string; contentType: "text" | "binary" | "media"; body?: string; udh?: string; receivedAt: string; sentAt?: string }[]; nextCursor?: string };
}
