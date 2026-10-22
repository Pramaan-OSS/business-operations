// The real schemas this product sends to generation calls. One test runs
// every one of them through the bounded-subset validator, so a schema the
// service would refuse fails here first.

import type { ToolDef } from "./capabilities";

export const ROUTING_SCHEMA = {
	type: "object",
	properties: {
		route: { type: "string" },
		score: { type: "number", minimum: 0, maximum: 1 },
		reason: { type: "string" },
	},
	required: ["route"],
	additionalProperties: false,
} as const;

export const TAX_RATE_SCHEMA = {
	type: "object",
	properties: {
		taxRate: {
			type: "number",
			minimum: 0,
			maximum: 100,
			description: "Standard VAT/GST rate as a percentage, e.g. 25 for 25%.",
		},
		taxType: { type: "string" },
		country: { type: "string" },
	},
	required: ["taxRate"],
	additionalProperties: false,
} as const;

export const TRANSACTION_ENRICH_SCHEMA = {
	type: "object",
	properties: {
		merchantName: { type: "string" },
		website: { type: "string" },
		category: { type: "string" },
	},
	required: ["merchantName"],
	additionalProperties: false,
} as const;

export const DOCUMENT_CLASSIFY_SCHEMA = {
	type: "object",
	properties: {
		documentType: { type: "string" },
		language: { type: "string" },
	},
	required: ["documentType"],
	additionalProperties: false,
} as const;

export const INSIGHT_ACTIONS_SCHEMA = {
	type: "object",
	properties: {
		actions: {
			type: "array",
			maxItems: 10,
			items: {
				type: "object",
				properties: { text: { type: "string" } },
				required: ["text"],
				additionalProperties: false,
			},
		},
	},
	required: ["actions"],
	additionalProperties: false,
} as const;

/** Tools the assistant can call, expressed in the bounded subset. */
export const ASSISTANT_TOOLS: ReadonlyArray<ToolDef> = [
	{
		name: "web_search",
		description: "Search the public web for real-time information.",
		parameters: {
			type: "object",
			properties: {
				query: { type: "string" },
			},
			required: ["query"],
			additionalProperties: false,
		},
	},
];
