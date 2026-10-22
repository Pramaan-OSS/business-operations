/** Hide optional zero decimals without rounding away a real currency subunit. */
export function invoiceFractionDigits(
  currency: string | null | undefined,
  includeDecimals: boolean | undefined,
  amounts: number[],
) {
  const digits = currency
    ? (new Intl.NumberFormat("en", {
        style: "currency",
        currency,
      }).resolvedOptions().maximumFractionDigits ?? 2)
    : 2;
  return includeDecimals || amounts.some((amount) => !Number.isInteger(amount))
    ? digits
    : 0;
}
