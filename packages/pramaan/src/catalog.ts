// The capabilities this product uses, with the traits the client needs offline: which are
// read_only (safe to retry) and which run as async jobs. Ids are real; see the capabilities
// catalogue. Effect classes per capability family:
//
//   read_only               email.status, sms.status, email.messages.list, email.message.get,
//                           email.attachment.*, llm.*, text.embed, web.search, geo.address.*,
//                           finance.* reads, banking.* reads, brand.*, companies.*, document.parse,
//                           document.extract (job), auth.social.exchange, auth.enterprise.*,
//                           storage.object.get, storage.object.download-url, apps.catalog.search,
//                           apps.connections.list, chat.messages.list, chat.message.get,
//                           payments.payment-link.get, payments.payment-link.orders.list,
//                           payments.checkout.get, imessage.message.receive
//   external_reversible     email.account.connect.start, auth.enterprise-connection.*,
//                           storage.object.upload-url, storage.upload.create,
//                           banking.connection.start, apps.connection.start
//   external_irreversible   email.send, email.template.send, sms.send, whatsapp.message.send,
//                           whatsapp.template.send, imessage.message.send, notify.message.send,
//                           payments.payment-link.create, payments.checkout.create,
//                           apps.action.execute, apps.connection.revoke, storage.object.put

import type { CapabilityInfo } from "./sdk/types";

type Entry = {
	description: string;
	effectClass: CapabilityInfo["effectClass"];
	mode: CapabilityInfo["mode"];
	needsConnection: boolean;
};

const R = (description: string): Entry => ({
	description,
	effectClass: "read_only",
	mode: "sync",
	needsConnection: false,
});
const RA = (description: string): Entry => ({
	description,
	effectClass: "read_only",
	mode: "async",
	needsConnection: false,
});
const RC = (description: string): Entry => ({
	description,
	effectClass: "read_only",
	mode: "sync",
	needsConnection: true,
});
const REV = (description: string): Entry => ({
	description,
	effectClass: "external_reversible",
	mode: "sync",
	needsConnection: false,
});
const REVC = (description: string): Entry => ({
	description,
	effectClass: "external_reversible",
	mode: "sync",
	needsConnection: true,
});
const IRR = (description: string): Entry => ({
	description,
	effectClass: "external_irreversible",
	mode: "sync",
	needsConnection: false,
});
const IRRC = (description: string): Entry => ({
	description,
	effectClass: "external_irreversible",
	mode: "sync",
	needsConnection: true,
});

const TABLE: Record<string, Entry> = {
	// Email
	"email.send": IRR("Send one email to up to 50 recipients, with optional attachments."),
	"email.template.send": IRR("Send a stored email template to recipients."),
	"email.status": R("Delivery status of a sent email."),
	"email.attachment.from-url": R("Fetch a public file as an email attachment object (max 6 MB)."),
	"email.attachment.get": RC("Read one attachment of a message as base64 (max 6 MB)."),
	"email.attachment.text.get": RA("Read one attachment's extracted text."),
	"email.account.disconnect": IRR("Disconnect an owned mailbox and end its rental."),
	"email.account.connect.start": REVC("Start connecting an end user's mailbox; returns a hosted sign-in link."),
	"email.account.connect.status": RC("Read the state of a mailbox connection and complete its claim."),
	"email.accounts.list": RC("List connected mailboxes."),
	"email.messages.list": RC("List messages in a connected mailbox."),
	"email.message.get": RC("Read one message in a connected mailbox."),

	// Chat and messaging channels
	"sms.send": IRR("Send a text message to an E.164 number."),
	"sms.status": R("Delivery status of a sent text message."),
	"sms.inbound-messages.list": R("List texts received by your numbers."),
	"whatsapp.message.send": IRRC("Send one WhatsApp message from the connected sender."),
	"whatsapp.template.send": IRRC("Send one approved WhatsApp template from the connected sender."),
	"imessage.message.send": IRR("Send one iMessage from a rented sender address."),
	"imessage.message.receive": RA("Wait for an incoming iMessage by authenticated polling."),
	"chat.channels.list": RC("List channels in a connected chat app."),
	"chat.messages.list": RC("Read a connected chat channel's message history."),
	"chat.message.get": RC("Read one stored message in a connected chat channel."),
	"notify.message.send": IRR("Send one message to one subscriber through one channel."),

	// Banking
	"banking.connection.start": REVC("Start a bank consent for an end user; returns a sign-in link."),
	"banking.connection.status": RC("Read a bank connection state and complete its one-time account claim."),
	"banking.accounts.list": RC("List accounts within an owned bank consent; numbers stay masked."),
	"banking.account.get": RC("Read an owned bank account description, type and masked number."),
	"banking.account.balances.get": RC("Read current bank-reported balances for one owned account."),
	"banking.account.owners.get": RC("Read bank-supplied account-holder names and requested contact fields."),
	"banking.transactions.sync": RC("Read transaction additions, modifications and removals since an owned consent cursor."),
	"banking.transactions.list": RC("Read up to 100 transactions from an owned bank account in a date range."),
	"banking.institutions.search": R("Find banks available in a country."),
	"banking.institution.get": R("Read a bank directory entry."),

	// Brand and companies
	"brand.from-transaction": R("Identify the merchant brand behind a card or bank transaction descriptor."),
	"brand.transaction.enrich": R("Enrich a transaction with merchant brand facts."),
	"brand.identity.get": R("Public brand identity for a domain."),
	"companies.enrich": R("Company profile from a domain, name or web address."),
	"companies.logo.get": RA("Retrieve a company logo as a job."),
	"companies.domain.find": R("Find a company's domain from its name."),

	// Documents
	"document.parse": R("Parse one document into text."),
	"document.extract": RA("Extract fields from one document as a job."),

	// Finance
	"finance.exchange-rate.get": R("One exchange rate between two currencies."),
	"finance.currency.convert": R("Convert an amount between currencies at the current rate."),
	"finance.tax-rates.get": R("Tax rates for a location."),
	"finance.consent.revoke": IRR("Revoke a financial consent."),
	"finance.vat-rates.get": R("Value-added tax rates for a country."),
	"finance.vat-number.validate": R("Validate a VAT number against the register."),
	"finance.currencies.list": R("List supported currencies."),

	// Places
	"geo.address.suggest": R("Address suggestions from partial input."),
	"geo.address.geocode-detailed": R("Detailed geocode of one address."),

	// Web
	"web.search": R("Search the web; returns organic results."),
	"web.read": R("Read one web page; returns its clean text and title."),

	// Models
	"llm.chat": R("Generate one stateless conversation turn with text and/or tool calls."),
	"llm.complete": R("Generate a text reply to a chat of messages."),
	"llm.models.list": R("List the models available to this project."),
	"text.embed": R("Embed one text into a vector."),

	// Payments (invoice payment links and hosted checkout on the operator's account)
	"payments.payment-link.create": IRR("Create a payment request link."),
	"payments.payment-link.get": R("Read a payment request."),
	"payments.payment-link.cancel": IRR("Cancel an unpaid payment request."),
	"payments.payment-link.orders.list": R("List paid orders against a payment link."),
	"payments.checkout.create": IRR("Create a hosted checkout session."),
	"payments.checkout.get": R("Read a checkout completion and captured payment references."),

	// Connected apps (the person's own third-party accounts)
	"apps.catalog.search": R("Find an app's actions on the connector, with action keys and input schemas."),
	"apps.connection.start": REV("Start connecting an end user to a third-party app; returns a hosted sign-in link."),
	"apps.connections.list": R("List one end user's third-party app connections and their status."),
	"apps.connection.revoke": IRR("Disconnect an end user from a third-party app and revoke its access."),
	"apps.action.execute": IRRC("Run one action in a connected third-party app as one of your end users."),

	// Sign-in
	"auth.backend.provision": REV("Provision managed sign-in for this app."),
	"auth.backend.domains.set": REV("Set this app's sign-in origins."),
	"auth.user.get": RC("Read an owned sign-in profile."),
	"auth.user.update": REVC("Rename an owned sign-in profile."),
	"auth.user.delete": IRRC("Delete an owned sign-in account."),
	"auth.token.verify": RC("Verify a managed sign-in token."),
	"db.postgres.provision": REV("Provision the application database."),
	"auth.social.exchange": RC("Redeem a single-use sign-in code for identity, email, name or picture."),
	"auth.enterprise.start": R("Start sign-in through one customer's identity provider."),
	"auth.enterprise-connection.create": REV("Save one customer's identity provider for enterprise sign-in."),
	"auth.enterprise-connection.delete": REV("Delete an enterprise sign-in connection."),
	"auth.enterprise-connections.list": R("List saved enterprise sign-in connections."),

	// Storage (optional path; local disk is the default)
	"storage.object.put": RA("Store a file up to 25 MB in your own bucket."),
	"storage.object.get": RA("Download up to 25 MB from your storage."),
	"storage.object.upload-url": REV("Create a short-lived signed upload URL."),
	"storage.object.download-url": R("Create a short-lived signed download URL."),
	"storage.upload.create": REV("Start a multipart upload."),
};

export const CATALOG: Record<string, CapabilityInfo> = Object.fromEntries(
	Object.entries(TABLE).map(([id, e]) => [
		id,
		{
			id,
			description: e.description,
			effectClass: e.effectClass,
			mode: e.mode,
			needsConnection: e.needsConnection,
		} satisfies CapabilityInfo,
	]),
);

const BY_ID = new Map<string, CapabilityInfo>(Object.entries(CATALOG));

/** Traits of one capability this product uses, or undefined for any other id. */
export function capabilityInfo(id: string): CapabilityInfo | undefined {
	return BY_ID.get(id);
}
