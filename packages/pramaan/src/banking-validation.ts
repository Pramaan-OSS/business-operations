import { publicBankReturnAddress, BankReturnAddressError } from "./bank-return-address";
import { BANKING_CONTRACTS } from "./banking-contracts";
import { PramaanError } from "./sdk/errors";
type Schema = { type?: string; properties?: Record<string, Schema>; required?: readonly string[];
  additionalProperties?: boolean; items?: Schema; enum?: readonly unknown[]; const?: unknown;
  minimum?: number; maximum?: number; minLength?: number; maxLength?: number; pattern?: string; maxItems?: number; minItems?: number };

export function matches(value: unknown, schema: Schema): boolean {
  if (schema.const !== undefined && value !== schema.const) return false;
  if (schema.enum && !schema.enum.includes(value)) return false;
  if (schema.type === "object") {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const record = value as Record<string, unknown>;
    if (schema.required?.some(key => record[key] === undefined)) return false;
    return Object.entries(record).every(([key, val]) => val === undefined || (schema.properties?.[key]
      ? matches(val, schema.properties[key]!) : schema.additionalProperties !== false));
  }
  if (schema.type === "array") return Array.isArray(value) && value.length <= (schema.maxItems ?? Infinity) && value.length >= (schema.minItems ?? 0) && value.every(item => !schema.items || matches(item, schema.items));
  if (schema.type === "string") return typeof value === "string" && value.length >= (schema.minLength ?? 0) && value.length <= (schema.maxLength ?? Infinity) && (!schema.pattern || new RegExp(schema.pattern).test(value));
  if (schema.type === "integer" || schema.type === "number") return typeof value === "number" && Number.isFinite(value) && (schema.type !== "integer" || Number.isSafeInteger(value)) && value >= (schema.minimum ?? -Infinity) && value <= (schema.maximum ?? Infinity);
  if (schema.type === "boolean") return typeof value === "boolean";
  return true;
}
export function validateBanking(id: string, kind: "input" | "result", value: unknown): void {
  const contract = BANKING_CONTRACTS[id as keyof typeof BANKING_CONTRACTS];
  if (contract && !matches(value, contract[kind] as Schema)) throw new PramaanError(kind === "input" ? "invalid_request" : "internal", kind === "input" ? "Check the bank connection request." : "The bank data could not be confirmed.");
  if (id === "banking.connection.start" && kind === "input" && !publicBankReturnAddress((value as { returnUrl?: string })?.returnUrl || "")) throw new BankReturnAddressError();
}
