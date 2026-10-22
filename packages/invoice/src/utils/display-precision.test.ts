import { expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Summary } from "../templates/html/components/summary";
import { invoiceFractionDigits } from "./display-precision";
import { formatCurrencyForPDF } from "./pdf-format";

test.each([
  ["GBP", false, 12.5, 2],
  ["GBP", false, 12, 0],
  ["GBP", true, 12, 2],
  ["KWD", false, 12.345, 3],
  ["JPY", true, 1200, 0],
] as const)("invoice precision preserves %s subunits with decimal preference %s", (currency, preference, amount, expected) => {
  const maximumFractionDigits = invoiceFractionDigits(currency, preference, [
    amount,
  ]);
  expect(maximumFractionDigits).toBe(expected);
  const options = { currency, amount, maximumFractionDigits, locale: "en-GB" };
  expect(formatCurrencyForPDF(options)).toBe(
    new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
      maximumFractionDigits,
    }).format(amount),
  );
});

test("fractional calculated totals retain cents even with whole unit prices", () => {
  expect(invoiceFractionDigits("GBP", false, [10, 1.5, 11.5])).toBe(2);
});

test("the default invoice summary shows the full payable amount", () => {
  const html = renderToStaticMarkup(
    createElement(Summary, {
      currency: "GBP",
      locale: "en-GB",
      includeDecimals: false,
      includeVat: false,
      includeTax: false,
      includeDiscount: false,
      discountLabel: "Discount",
      taxRate: 0,
      vatRate: 0,
      vatLabel: "VAT",
      taxLabel: "Tax",
      totalLabel: "Total",
      subtotalLabel: "Subtotal",
      lineItems: [{ name: "Service", quantity: 1, price: 12.5 }],
    }),
  );
  expect(html).toContain("£12.50");
  expect(html).not.toContain("£13");
});
