import type { z } from "zod/v4";
import {
  createInvoicePromptComponents,
  createReceiptPromptComponents,
  type PromptComponents,
} from "../prompts/factory";
import { invoiceSchema, receiptSchema } from "../schema";
import type { DocumentFormat } from "../utils/format-detection";

export interface ExtractionConfig<T extends z.ZodSchema> {
  schema: T;
  qualityThreshold: number;
  criticalFields: string[];
  fieldPriority: Record<string, number>; // Higher number = higher priority
  promptFactory: (
    companyName?: string | null,
    format?: DocumentFormat,
  ) => PromptComponents;
}

/**
 * Invoice extraction configuration
 */
export const invoiceConfig: ExtractionConfig<typeof invoiceSchema> = {
  schema: invoiceSchema,
  qualityThreshold: 70,
  criticalFields: [
    "total_amount",
    "currency",
    "vendor_name",
    "invoice_date",
    "due_date",
  ],
  fieldPriority: {
    total_amount: 10,
    currency: 10,
    vendor_name: 9,
    invoice_number: 8,
    invoice_date: 8,
    due_date: 7,
    tax_amount: 6,
    tax_rate: 6,
    customer_name: 5,
    email: 4,
    website: 4,
    vendor_address: 3,
    customer_address: 3,
    payment_instructions: 2,
    notes: 1,
    language: 1,
  },
  promptFactory: (companyName, format) => {
    return createInvoicePromptComponents(companyName, false, format);
  },
};

/**
 * Receipt extraction configuration
 */
export const receiptConfig: ExtractionConfig<typeof receiptSchema> = {
  schema: receiptSchema,
  qualityThreshold: 70,
  criticalFields: ["total_amount", "currency", "store_name", "date"],
  fieldPriority: {
    total_amount: 10,
    currency: 10,
    store_name: 9,
    date: 8,
    tax_amount: 7,
    tax_rate: 6,
    subtotal_amount: 5,
    payment_method: 4,
    email: 3,
    website: 3,
    cashier_name: 2,
    register_number: 2,
    language: 1,
  },
  promptFactory: (companyName, format) => {
    return createReceiptPromptComponents(companyName, false, format);
  },
};
