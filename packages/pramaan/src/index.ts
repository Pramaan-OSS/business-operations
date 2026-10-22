export { emailSender, DEFAULT_EMAIL_SENDER } from "./email-sender";
export { publicBankReturnAddress, BANK_RETURN_ADDRESS_NOTICE, BankReturnAddressError } from "./bank-return-address";
export { embedInSpace, EMBEDDING_BATCH_SIZE } from "./embedding-batch";
import { validateDocumentExtraction } from "./document-extraction";
export { validateDocumentExtraction, type DocumentExtraction } from "./document-extraction";
import { validateEmbeddingInput } from "./embedding-validation";
import { validatePaymentLinks } from "./payment-links";
import { managedUser, managedBackend, managedDomains, managedIdentity, managedDatabase } from "./managed-contracts";
import { validateImessageInput, validateImessageResult, type ImessageReceiveResult } from "./imessage";
export { validateImessageResult, type ImessageReceiveResult, type IncomingMessage } from "./imessage";
import { demoFetch } from "./demo-transport";
import { validateApps } from "./apps-validation";
import { validateBanking } from "./banking-validation";
// @business-operations/pramaan — the one module through which every outside call in this
// product flows. Built from PRAMAAN_API_KEY and optional PRAMAAN_BASE_URL.
// Nothing else in the repository talks to an outside service. The SDK is
// provided by @pramaan/sdk, with product compatibility helpers under src/sdk.

import { completeGeneration, completeGenerationStream, generationError } from "./generation-reply";
export { runReadOnlyOutcome, runReadOnlyCapability, OutcomeStopped, CHECK_RESULT } from "./outcome";
import { OutcomeStopped } from "./outcome";
import { validateLogoResult, type HostedFile } from "./logo";
export { validateLogoResult, type HostedFile, type LogoResult } from "./logo";
export { IncompleteGeneration } from "./generation-reply";
import { withModelRateLimit, withStreamRateLimit, type WaitForModel } from "./rate-limit";
import { randomUUID } from "node:crypto";
import { CATALOG, capabilityInfo } from "./catalog";
import { normalizeGenerationSchemas, validateGenerationSchemas } from "./json-schema";
import { DEFAULT_BASE_URL, PramaanClient } from "./sdk/client";
import { PramaanError } from "./sdk/errors";
import type {
  CapabilityDescription,
  CapabilityInfo,
  CapabilitySummary,
  Estimate,
  Job,
  JobStatus,
  LlmChatStreamEvent,
  OutcomeDescription,
  OutcomeEstimate,
  OutcomeRun,
  OutcomeRunOptions,
  OutcomeRunStep,
  OutcomeStep,
  OutcomeSummary,
  RunOptions,
  WaitOptions,
} from "./sdk/types";
import type {
  Caps,
  TextEmbedRequest,
  TextEmbedResult,
  WebSearchRequest,
  WebSearchResult,
} from "./capabilities";

export { CATALOG, capabilityInfo };
export {
  assertBoundedJsonSchema,
  normalizeJsonSchema,
  normalizeGenerationSchemas,
  validateGenerationSchemas,
} from "./json-schema";
export {
  firstList,
  firstText,
  type JsonObject,
  type JsonValue,
  list,
  record,
  text,
} from "./json";
export {
  DEFAULT_BASE_URL,
  PRAMAAN_API_URL,
  PramaanClient,
  type PramaanOptions,
} from "./sdk/client";
export { toOutcomeRun } from "./sdk/client";
export { type ErrorCode, PramaanError } from "./sdk/errors";
export type {
  CapabilityDescription,
  CapabilityInfo,
  CapabilitySummary,
  Estimate,
  Job,
  JobStatus,
  LlmChatStreamEvent,
  OutcomeDescription,
  OutcomeEstimate,
  OutcomeRun,
  OutcomeRunOptions,
  OutcomeRunStep,
  OutcomeStep,
  OutcomeSummary,
  RunOptions,
  WaitOptions,
};
export type {
  Caps,
  TextEmbedRequest,
  TextEmbedResult,
  WebSearchRequest,
  WebSearchResult,
} from "./capabilities";

/** Capability ids this product calls, as a const so callers never mistype one. */
export const Cap = {
  authBackendProvision: "auth.backend.provision",
  authBackendDomainsSet: "auth.backend.domains.set",
  authUserGet: "auth.user.get",
  authUserUpdate: "auth.user.update",
  authUserDelete: "auth.user.delete",
  authTokenVerify: "auth.token.verify",
  dbPostgresProvision: "db.postgres.provision",
  // Email
  emailSend: "email.send",
  emailTemplateSend: "email.template.send",
  emailStatus: "email.status",
  emailAttachmentFromUrl: "email.attachment.from-url",
  emailAttachmentGet: "email.attachment.get",
  emailAttachmentTextGet: "email.attachment.text.get",
  emailAccountDisconnect: "email.account.disconnect",
  emailAccountConnectStart: "email.account.connect.start",
  emailAccountConnectStatus: "email.account.connect.status",
  emailAccountsList: "email.accounts.list",
  emailMessagesList: "email.messages.list",
  emailMessageGet: "email.message.get",

  // Chat and messaging channels
  smsSend: "sms.send",
  smsStatus: "sms.status",
  smsInboundMessagesList: "sms.inbound-messages.list",
  whatsappMessageSend: "whatsapp.message.send",
  whatsappTemplateSend: "whatsapp.template.send",
  imessageMessageSend: "imessage.message.send",
  imessageMessageReceive: "imessage.message.receive",
  chatChannelsList: "chat.channels.list",
  chatMessagesList: "chat.messages.list",
  chatMessageGet: "chat.message.get",
  notifyMessageSend: "notify.message.send",

  // Banking
  bankingConnectionStart: "banking.connection.start",
  bankingConnectionStatus: "banking.connection.status",
  bankingAccountsList: "banking.accounts.list",
  bankingAccountGet: "banking.account.get",
  bankingAccountBalancesGet: "banking.account.balances.get",
  bankingAccountOwnersGet: "banking.account.owners.get",
  bankingTransactionsSync: "banking.transactions.sync",
  bankingTransactionsList: "banking.transactions.list",
  bankingInstitutionsSearch: "banking.institutions.search",
  bankingInstitutionGet: "banking.institution.get",

  // Brand and companies
  brandFromTransaction: "brand.from-transaction",
  brandTransactionEnrich: "brand.transaction.enrich",
  brandIdentityGet: "brand.identity.get",
  companiesEnrich: "companies.enrich",
  companiesLogoGet: "companies.logo.get",
  companiesDomainFind: "companies.domain.find",

  // Documents
  documentParse: "document.parse",
  documentExtract: "document.extract",

  // Finance
  financeExchangeRateGet: "finance.exchange-rate.get",
  financeConsentRevoke: "finance.consent.revoke",
  financeCurrencyConvert: "finance.currency.convert",
  financeTaxRatesGet: "finance.tax-rates.get",
  financeVatRatesGet: "finance.vat-rates.get",
  financeVatNumberValidate: "finance.vat-number.validate",
  financeCurrenciesList: "finance.currencies.list",

  // Places
  geoAddressSuggest: "geo.address.suggest",
  geoAddressGeocodeDetailed: "geo.address.geocode-detailed",

  // Web
  webSearch: "web.search",
  webRead: "web.read",

  // Models
  llmChat: "llm.chat",
  llmComplete: "llm.complete",
  llmModelsList: "llm.models.list",
  textEmbed: "text.embed",

  // Payments (invoice payment links and hosted checkout)
  paymentsPaymentLinkCreate: "payments.payment-link.create",
  paymentsPaymentLinkGet: "payments.payment-link.get",
  paymentsPaymentLinkCancel: "payments.payment-link.cancel",
  paymentsPaymentLinkOrdersList: "payments.payment-link.orders.list",
  paymentsCheckoutCreate: "payments.checkout.create",
  paymentsCheckoutGet: "payments.checkout.get",

  // Connected apps
  appsCatalogSearch: "apps.catalog.search",
  appsConnectionStart: "apps.connection.start",
  appsConnectionsList: "apps.connections.list",
  appsConnectionRevoke: "apps.connection.revoke",
  appsActionExecute: "apps.action.execute",

  // Sign-in
  authSocialExchange: "auth.social.exchange",
  authEnterpriseStart: "auth.enterprise.start",
  authEnterpriseConnectionCreate: "auth.enterprise-connection.create",
  authEnterpriseConnectionDelete: "auth.enterprise-connection.delete",
  authEnterpriseConnectionsList: "auth.enterprise-connections.list",

  // Storage (optional path; local disk is the default)
  storageObjectPut: "storage.object.put",
  storageObjectGet: "storage.object.get",
  storageObjectUploadUrl: "storage.object.upload-url",
  storageObjectDownloadUrl: "storage.object.download-url",
  storageUploadCreate: "storage.upload.create",
} as const;

export type CapId = (typeof Cap)[keyof typeof Cap];

/** Plain words for a surface that cannot run yet. No service name, no detail. */
export const NOT_AVAILABLE = "This feature is not available yet.";

/** True when an error means the capability is not served yet. */
export function isUnavailable(error: unknown): boolean {
  return (
    error instanceof PramaanError && (error.code === "upstream_unavailable" || error.code === "not_found")
  );
}

/**
 * Message to show for a failed outside call. Unavailable surfaces get one
 * plain sentence; everything else gets a generic line. Never a service name,
 * never a stack trace, never the raw error.
 */
export function unavailableMessage(error: unknown): string {
  if (error instanceof OutcomeStopped) return error.message;
  if (error instanceof MissingPramaanKey) return MISSING_KEY_MESSAGE;
  if (error instanceof Error && [NOT_AVAILABLE, MISSING_KEY_MESSAGE].includes(error.message)) return error.message;
  return isUnavailable(error)
    ? NOT_AVAILABLE
    : "Could not confirm the result. Check its status before trying again.";
}
export const MISSING_KEY_MESSAGE = "Add PRAMAAN_API_KEY to .env";
export class MissingPramaanKey extends PramaanError {
  constructor() {
    super("unauthorized", MISSING_KEY_MESSAGE, { status: 422 });
  }
}
export function requirePramaan(): Pramaan {
  const client = pramaanFromEnv();
  if (!client) throw new MissingPramaanKey();
  return client;
}

export function validateGenerationRequest(input: unknown): asserts input is Caps.LlmRequest {
  const request = input as Caps.LlmRequest & { prompt?: unknown };
  if (
    !request ||
    typeof request !== "object" ||
    "prompt" in request ||
    !Array.isArray(request.messages) ||
    !request.messages.length
  )
    throw new PramaanError("invalid_request", "Generation requires messages instead of prompt.");
  for (const [index, message] of request.messages.entries())
    if (
      !message ||
      !["system", "user", "assistant", "tool"].includes(message.role) ||
      typeof message.content !== "string"
    )
      throw new PramaanError(
        "invalid_request",
        `Generation messages at #/messages/${index} must contain a role and text.`
      );
  if (!Number.isInteger(request.maxTokens) || request.maxTokens! < 64 || request.maxTokens! > 8192)
    throw new PramaanError("invalid_request", "Generation requires maxTokens from 64 to 8192.");
  validateGenerationSchemas(request);
}
export function prepareGenerationRequest(input: unknown): Caps.LlmRequest {
  const request = normalizeGenerationSchemas({
    ...(input as Record<string, unknown>),
    maxTokens: (input as Caps.LlmRequest)?.maxTokens ?? 256,
  });
  validateGenerationRequest(request);
  return request;
}

type AnyReq = Record<string, unknown>;

export class Pramaan {
  constructor(
    private readonly client: PramaanClient,
    private readonly waitForRateLimit?: WaitForModel
  ) {}

  get raw(): PramaanClient {
    return this.client;
  }

  async call(id: CapId, input: unknown, opts?: RunOptions): Promise<unknown> {
    if (id === Cap.textEmbed) validateEmbeddingInput(input);
    if (id === Cap.llmChat || id === Cap.llmComplete) {
      const prepared = prepareGenerationRequest(input);
      return withModelRateLimit(() => this.client.call(id, prepared, opts), this.waitForRateLimit)
        .then(completeGeneration).catch(error => { throw generationError(error); });
    }
    if (id === Cap.imessageMessageReceive) validateImessageInput(input);
    validatePaymentLinks(id, "input", input);
    validateBanking(id, "input", input);
    validateApps(id, "input", input);
    const result = await this.client.call(id, input, opts);
    validatePaymentLinks(id, "result", result);
    validateBanking(id, "result", result);
    validateApps(id, "result", result);
    if (id === Cap.documentExtract) return validateDocumentExtraction(result);
    return id === Cap.imessageMessageReceive ? validateImessageResult(result) : result;
  }
  async run(id: CapId, input: unknown, opts?: RunOptions): Promise<unknown> {
    const generation = id === Cap.llmChat || id === Cap.llmComplete;
    try {
      const result = await this.client.run(id, generation ? prepareGenerationRequest(input) : input, opts);
      return generation ? completeGeneration(result) : result;
    } catch (error) { throw generation ? generationError(error) : error; }
  }

  info(id: string) {
    return this.client.info(id);
  }

  get jobs() {
    return this.client.jobs;
  }

  get capabilities() {
    return this.client.capabilities;
  }

  /**
   * Outcomes: fixed recipes of capability steps. Estimate first (the plan is
   * good for 15 minutes), show a person the steps when approval is needed,
   * then run with the plan. A long run answers 202 + a job; cancel through
   * jobs.cancel. Never auto-retry a run: a step with effect "unknown" may
   * already have acted — tell the user to check before retrying.
   */
  get accounts() { return this.client.accounts; }
  get outcomes() {
    return this.client.outcomes;
  }

  llmChatStream(input: Caps.LlmRequest, opts?: RunOptions): AsyncGenerator<LlmChatStreamEvent> {
    const prepared = prepareGenerationRequest(input);
    return completeGenerationStream(withStreamRateLimit(() => this.client.llmChatStream(prepared, opts), this.waitForRateLimit));
  }

  // ── Typed helpers, one per capability family the product uses ─────────────

  authBackendProvision(opts?: RunOptions) {
    return this.call(Cap.authBackendProvision, {}, opts).then(managedBackend);
  }
  authBackendDomainsSet(input: { domains: readonly string[] }, opts?: RunOptions) {
    return this.call(Cap.authBackendDomainsSet, input, opts).then(managedDomains);
  }
  authUserGet(userId: string) {
    return this.call(Cap.authUserGet, { userId }).then(managedUser);
  }
  authUserUpdate(userId: string, name: string, opts: RunOptions) {
    return this.call(Cap.authUserUpdate, { userId, name }, opts).then(managedUser);
  }
  authUserDelete(userId: string, opts: RunOptions) {
    return this.call(Cap.authUserDelete, { userId, confirm: true }, opts).then(value => { if (!value || (value as { deleted?: unknown }).deleted !== true) throw new Error("Account deletion could not be confirmed."); return { deleted: true as const }; });
  }
  authTokenVerify(input: { token: string; audience?: string; authorizedParties?: readonly string[] }, opts?: RunOptions) {
    return this.call(Cap.authTokenVerify, input, opts).then(managedIdentity);
  }
  dbPostgresProvision(opts?: RunOptions) {
    return this.call(Cap.dbPostgresProvision, {}, opts).then(managedDatabase);
  }
  emailSend(input: Caps.EmailSendRequest, opts?: RunOptions) {
    return this.call(Cap.emailSend, input, opts) as Promise<Caps.EmailSendResult>;
  }
  emailTemplateSend(input: Caps.EmailTemplateSendRequest, opts?: RunOptions) {
    return this.call(Cap.emailTemplateSend, input, opts);
  }

  smsSend(input: Caps.SmsSendRequest, opts?: RunOptions) {
    return this.call(Cap.smsSend, input, opts) as Promise<Caps.SmsSendResult>;
  }
  smsStatus(input: { ref: string }, opts?: RunOptions) {
    return this.call(Cap.smsStatus, input, opts);
  }

  appsCatalogSearch(input: Caps.AppsCatalogSearchRequest, opts?: RunOptions) {
    return this.call(Cap.appsCatalogSearch, input, opts) as Promise<Caps.AppsCatalogSearchResult>;
  }
  appsConnectionStart(input: Caps.AppsConnectionStartRequest, opts?: RunOptions) {
    return this.call(Cap.appsConnectionStart, input, opts) as Promise<Caps.AppsConnectionStartResult>;
  }
  appsConnectionRevoke(input: { endUserRef: string; app: string }, opts: RunOptions) {
    return this.call("apps.connection.revoke", input, opts).then(value => {
      const revoked = value && typeof value === "object" ? (value as { revoked?: unknown }).revoked : undefined;
      if (typeof revoked !== "number" || !Number.isInteger(revoked) || revoked < 0) throw new Error("Connected account revocation could not be confirmed.");
      return { revoked };
    });
  }
  appsConnectionsList(input: Caps.AppsConnectionsListRequest, opts?: RunOptions) {
    return this.call(Cap.appsConnectionsList, input, opts) as Promise<Caps.AppsConnectionsListResult>;
  }
  appsActionExecute(input: Caps.AppsActionExecuteRequest, opts?: RunOptions) {
    return this.call(Cap.appsActionExecute, input, opts) as Promise<Caps.AppsActionExecuteResult>;
  }

  llmChat(input: Caps.LlmRequest, opts?: RunOptions) {
    return this.call(Cap.llmChat, input, opts) as Promise<Caps.LlmResult>;
  }
  llmComplete(input: Caps.LlmRequest, opts?: RunOptions) {
    return this.call(Cap.llmComplete, input, opts) as Promise<Caps.LlmResult>;
  }

  textEmbed(input: TextEmbedRequest, opts?: RunOptions) {
    return this.call(Cap.textEmbed, input, opts) as Promise<TextEmbedResult>;
  }
  webSearch(input: WebSearchRequest, opts?: RunOptions) {
    return this.call(Cap.webSearch, input, opts) as Promise<WebSearchResult>;
  }
  webRead(input: { url: string }, opts?: RunOptions) {
    return this.call(Cap.webRead, input, opts);
  }

  async companiesLogoGet(input: Caps.CompaniesLogoGetRequest, opts?: RunOptions) {
    return validateLogoResult(await this.call(Cap.companiesLogoGet, input, opts));
  }
  downloadHostedFile(file: HostedFile): Promise<Uint8Array> {
    return this.client.downloadHostedFile(file);
  }
  companiesEnrich(input: Caps.CompaniesEnrichRequest, opts?: RunOptions) {
    return this.call(Cap.companiesEnrich, input, opts);
  }
  companiesDomainFind(input: { name: string }, opts?: RunOptions) {
    return this.call(Cap.companiesDomainFind, input, opts);
  }
  brandFromTransaction(input: Caps.BrandFromTransactionRequest, opts?: RunOptions) {
    return this.call(Cap.brandFromTransaction, input, opts) as Promise<Caps.BrandFromTransactionResult>;
  }
  brandTransactionEnrich(input: Caps.BrandFromTransactionRequest, opts?: RunOptions) {
    return this.call(Cap.brandTransactionEnrich, input, opts) as Promise<Caps.BrandFromTransactionResult>;
  }

  bankingInstitutionsSearch(input: Caps.BankingInstitutionsSearchRequest, opts?: RunOptions) {
    return this.call(Cap.bankingInstitutionsSearch, input, opts) as Promise<import("./banking-contracts").BankingInstitutionsSearchResult>;
  }
  bankingConnectionStart(input: Caps.BankingConnectionStartRequest, opts: RunOptions) {
    return this.call(Cap.bankingConnectionStart, input, opts) as Promise<Caps.BankingConnectionStartResult>;
  }
  bankingConnectionStatus(input: Caps.BankingConnectionStatusRequest, opts?: RunOptions) {
    return this.call(Cap.bankingConnectionStatus, input, opts) as Promise<import("./banking-contracts").BankingConnectionStatusResult>;
  }
  bankingAccountsList(input: import("./banking-contracts").BankingAccountsListRequest, opts?: RunOptions) {
    return this.call(Cap.bankingAccountsList, input, opts) as Promise<import("./banking-contracts").BankingAccountsListResult>;
  }
  bankingAccountBalancesGet(input: import("./banking-contracts").BankingAccountBalancesGetRequest, opts?: RunOptions) {
    return this.call(Cap.bankingAccountBalancesGet, input, opts) as Promise<import("./banking-contracts").BankingAccountBalancesGetResult>;
  }
  bankingTransactionsSync(input: Caps.BankingTransactionsSyncRequest, opts?: RunOptions) {
    return this.call(Cap.bankingTransactionsSync, input, opts) as Promise<import("./banking-contracts").BankingTransactionsSyncResult>;
  }
  bankingTransactionsList(input: Caps.BankingTransactionsListRequest, opts?: RunOptions) {
    return this.call(Cap.bankingTransactionsList, input, opts) as Promise<import("./banking-contracts").BankingTransactionsListResult>;
  }

  documentParse(input: Caps.DocumentParseRequest, opts?: RunOptions) {
    return this.call(Cap.documentParse, input, opts);
  }
  documentExtract(input: Caps.DocumentExtractRequest, opts?: RunOptions) {
    return this.call(Cap.documentExtract, input, opts);
  }

  financeExchangeRateGet(input: Caps.ExchangeRateGetRequest, opts?: RunOptions) {
    return this.call(Cap.financeExchangeRateGet, input, opts) as Promise<Caps.ExchangeRateGetResult>;
  }
  financeCurrencyConvert(input: Caps.CurrencyConvertRequest, opts?: RunOptions) {
    return this.call(Cap.financeCurrencyConvert, input, opts) as Promise<Caps.CurrencyConvertResult>;
  }
  financeTaxRatesGet(input: Caps.TaxRatesGetRequest, opts?: RunOptions) {
    return this.call(Cap.financeTaxRatesGet, input, opts);
  }
  financeVatRatesGet(input: { countryCode: string }, opts?: RunOptions) {
    return this.call(Cap.financeVatRatesGet, input, opts);
  }
  financeVatNumberValidate(input: Caps.VatNumberValidateRequest, opts?: RunOptions) {
    return this.call(Cap.financeVatNumberValidate, input, opts);
  }

  geoAddressSuggest(input: Caps.GeoAddressSuggestRequest, opts?: RunOptions) {
    return this.call(Cap.geoAddressSuggest, input, opts) as Promise<Caps.GeoAddressSuggestResult>;
  }

  paymentLinkCreate(input: Caps.PaymentLinkCreateRequest, opts: RunOptions) {
    return this.call(Cap.paymentsPaymentLinkCreate, input, opts) as Promise<Caps.PaymentLinkResult>;
  }
  paymentLinkGet(input: Caps.PaymentLinkGetRequest, opts?: RunOptions) {
    return this.call(Cap.paymentsPaymentLinkGet, input, opts) as Promise<Caps.PaymentLinkResult>;
  }
  paymentLinkCancel(input: Caps.PaymentLinkGetRequest, opts: RunOptions) {
    return this.call(Cap.paymentsPaymentLinkCancel, input, opts);
  }
  paymentLinkOrdersList(input: Caps.PaymentLinkGetRequest, opts?: RunOptions) {
    return this.call(Cap.paymentsPaymentLinkOrdersList, input, opts);
  }
  checkoutCreate(input: Caps.CheckoutCreateRequest, opts: RunOptions) {
    return this.call(Cap.paymentsCheckoutCreate, input, opts) as Promise<Caps.CheckoutCreateResult>;
  }
  checkoutGet(input: Caps.CheckoutGetRequest, opts?: RunOptions) {
    return this.call(Cap.paymentsCheckoutGet, input, opts);
  }

  notifyMessageSend(input: Caps.NotifyMessageSendRequest, opts: RunOptions) {
    return this.call(Cap.notifyMessageSend, input, opts);
  }
  whatsappMessageSend(input: AnyReq, opts: RunOptions) {
    return this.call(Cap.whatsappMessageSend, input, opts);
  }
  imessageMessageSend(input: Caps.ImessageSendRequest, opts: RunOptions) {
    return this.call(Cap.imessageMessageSend, input, opts);
  }
  smsInboundMessagesList(input: Caps.SmsInboundMessagesListRequest, opts?: RunOptions) {
    return this.call(Cap.smsInboundMessagesList, input, opts) as Promise<Caps.SmsInboundMessagesListResult>;
  }
  imessageMessageReceive(input: Caps.ImessageReceiveRequest, opts?: RunOptions) {
    return this.call(Cap.imessageMessageReceive, input, opts) as Promise<ImessageReceiveResult>;
  }
  chatChannelsList(input: AnyReq, opts?: RunOptions) {
    return this.call(Cap.chatChannelsList, input, opts);
  }
  chatMessagesList(input: Caps.ChatMessagesListRequest, opts?: RunOptions) {
    return this.call(Cap.chatMessagesList, input, opts) as Promise<{ results: Caps.ChatMessageRow[]; nextCursor?: string | null }>;
  }
  chatMessageGet(input: { channelId: string; messageId: string }, opts?: RunOptions) {
    return this.call(Cap.chatMessageGet, input, opts) as Promise<Caps.ChatMessageRow>;
  }

  authSocialExchange(input: AnyReq, opts?: RunOptions) {
    return this.call(Cap.authSocialExchange, input, opts);
  }
  authEnterpriseStart(input: AnyReq, opts?: RunOptions) {
    return this.call(Cap.authEnterpriseStart, input, opts);
  }
  authEnterpriseConnectionsList(input: AnyReq, opts?: RunOptions) {
    return this.call(Cap.authEnterpriseConnectionsList, input, opts);
  }
  authEnterpriseConnectionCreate(input: AnyReq, opts: RunOptions) {
    return this.call(Cap.authEnterpriseConnectionCreate, input, opts);
  }
  authEnterpriseConnectionDelete(input: AnyReq, opts: RunOptions) {
    return this.call(Cap.authEnterpriseConnectionDelete, input, opts);
  }

  storageObjectPut(input: AnyReq, opts: RunOptions) {
    return this.call(Cap.storageObjectPut, input, opts);
  }
  storageObjectGet(input: AnyReq, opts?: RunOptions) {
    return this.call(Cap.storageObjectGet, input, opts);
  }
  storageObjectDownloadUrl(input: AnyReq, opts?: RunOptions) {
    return this.call(Cap.storageObjectDownloadUrl, input, opts);
  }

  /** Upload a file and return its handle, for capabilities that take a `fileId`. */
  uploadFile(input: {
    data: Uint8Array;
    kind: "image" | "audio" | "document" | "data" | "video" | "part";
    contentType: string;
  }) {
    return this.client.files.upload(input);
  }
}

/** A new key for an `external_*` call: the same key can never run the call twice. */
export function idempotencyKey(): string {
  return randomUUID();
}

/** Builds a client from explicit settings (env loaders pass theirs). */
export function createPramaan(options: {
  apiKey: string;
  baseUrl?: string;
  fetch?: (input: string, init: RequestInit) => Promise<Response>;
  sleep?: (ms: number) => Promise<void>;
  waitForRateLimit?: WaitForModel;
}): Pramaan {
  return new Pramaan(
    new PramaanClient({
      apiKey: options.apiKey,
      baseUrl: options.baseUrl,
      fetch: options.fetch,
      sleep: options.sleep,
    }),
    options.waitForRateLimit
  );
}

/**
 * The one place `PRAMAAN_API_KEY` is read from the environment. Every consumer
 * gets its client (or its answer about whether one is configured) from here.
 */
export function pramaanFromEnv(): Pramaan | null {
  const apiKey = process.env.PRAMAAN_API_KEY?.trim();
  if (!apiKey) return null;
  return createPramaan({
    apiKey,
    baseUrl: process.env.PRAMAAN_BASE_URL?.trim() || undefined,
    ...(process.env.PRAMAAN_FAKE === "1" ? { fetch: demoFetch } : {}),
  });
}

/** True when a key is configured. */
export function pramaanKeySet(): boolean {
  return Boolean(process.env.PRAMAAN_API_KEY?.trim());
}
