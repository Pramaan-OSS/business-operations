/**
 * Currency Utilities
 *
 * Handles currency-specific formatting for payments.
 * Payments require amounts in the smallest currency unit, which varies by currency.
 *
 */

/**
 * Zero-decimal currencies where 1 unit = 1 smallest unit.
 * For these currencies, amounts should NOT be multiplied by 100.
 * Example: ¥1000 JPY should be passed as 1000, not 100000.
 *
 * Supported zero-decimal payment currencies:
 */
export const ZERO_DECIMAL_CURRENCIES = new Set([
  "bif", // Burundian Franc
  "clp", // Chilean Peso
  "djf", // Djiboutian Franc
  "gnf", // Guinean Franc
  "jpy", // Japanese Yen
  "kmf", // Comorian Franc
  "krw", // South Korean Won
  "mga", // Malagasy Ariary
  "pyg", // Paraguayan Guaraní
  "rwf", // Rwandan Franc
  "ugx", // Ugandan Shilling
  "vnd", // Vietnamese Dong
  "vuv", // Vanuatu Vatu
  "xaf", // Central African CFA Franc
  "xof", // West African CFA Franc
  "xpf", // CFP Franc
]);

/**
 * Three-decimal currencies where amounts should be multiplied by 1000.
 * These currencies have 3 decimal places instead of the usual 2.
 *
 * Supported three-decimal payment currencies:
 */
export const THREE_DECIMAL_CURRENCIES = new Set([
  "bhd", // Bahraini Dinar
  "jod", // Jordanian Dinar
  "kwd", // Kuwaiti Dinar
  "omr", // Omani Rial
  "tnd", // Tunisian Dinar
]);

/**
 * Check if a currency is a zero-decimal currency.
 * Zero-decimal currencies don't have subunits (like cents).
 *
 * @param currency - ISO 4217 currency code (case-insensitive)
 * @returns true if the currency is a zero-decimal currency
 *
 * @example
 * isZeroDecimalCurrency("JPY") // true
 * isZeroDecimalCurrency("usd") // false
 */
export function isZeroDecimalCurrency(currency: string): boolean {
  return ZERO_DECIMAL_CURRENCIES.has(currency.toLowerCase());
}

/**
 * Check if a currency is a three-decimal currency.
 * Three-decimal currencies have 3 decimal places (e.g., 1.000 KWD).
 *
 * @param currency - ISO 4217 currency code (case-insensitive)
 * @returns true if the currency is a three-decimal currency
 *
 * @example
 * isThreeDecimalCurrency("KWD") // true
 * isThreeDecimalCurrency("usd") // false
 */
export function isThreeDecimalCurrency(currency: string): boolean {
  return THREE_DECIMAL_CURRENCIES.has(currency.toLowerCase());
}

/**
 * Get the decimal multiplier for a currency.
 * - Zero-decimal currencies: 1 (no conversion needed)
 * - Three-decimal currencies: 1000
 * - Standard currencies: 100 (cents)
 *
 * @param currency - ISO 4217 currency code (case-insensitive)
 * @returns The multiplier to convert from currency units to smallest units
 *
 * @example
 * getCurrencyMultiplier("USD") // 100
 * getCurrencyMultiplier("JPY") // 1
 * getCurrencyMultiplier("KWD") // 1000
 */
export function getCurrencyMultiplier(currency: string): number {
  const normalized = currency.toLowerCase();

  if (ZERO_DECIMAL_CURRENCIES.has(normalized)) {
    return 1;
  }

  if (THREE_DECIMAL_CURRENCIES.has(normalized)) {
    return 1000;
  }

  return 100;
}

/**
 * Convert an amount to the smallest currency unit.
 *
 * Payments require amounts in the smallest currency unit:
 * - USD $10.00 → 1000 (cents)
 * - JPY ¥1000 → 1000 (already smallest unit)
 * - KWD 1.500 → 1500 (fils)
 *
 * @param amount - The amount in the currency's standard unit (e.g., dollars, yen)
 * @param currency - ISO 4217 currency code (case-insensitive)
 * @returns The amount in smallest currency units, rounded to nearest integer
 *
 * @example
 * toMinorAmount(10.00, "USD")  // 1000 (cents)
 * toMinorAmount(1000, "JPY")   // 1000 (yen, no conversion)
 * toMinorAmount(10.00, "KWD")  // 10000 (fils)
 * toMinorAmount(10.50, "EUR")  // 1050 (cents)
 */
export function toMinorAmount(amount: number, currency: string): number {
  const multiplier = getCurrencyMultiplier(currency);
  return Math.round(amount * multiplier);
}

/**
 * Convert a minor-unit amount back to the currency's standard unit.
 *
 * This is the inverse of toMinorAmount.
 *
 * @param minorAmount - The amount in smallest currency units
 * @param currency - ISO 4217 currency code (case-insensitive)
 * @returns The amount in the currency's standard unit
 *
 * @example
 * fromMinorAmount(1000, "USD")  // 10.00 (dollars)
 * fromMinorAmount(1000, "JPY")  // 1000 (yen)
 * fromMinorAmount(10000, "KWD") // 10.00 (dinars)
 */
export function fromMinorAmount(
  minorAmount: number,
  currency: string,
): number {
  const multiplier = getCurrencyMultiplier(currency);
  return minorAmount / multiplier;
}
