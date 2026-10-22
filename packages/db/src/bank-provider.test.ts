import { expect, test } from "bun:test";
import { bankProviderView } from "./bank-provider";
test("stored bank integrations stay readable without becoming usable connections", () => {
  expect(bankProviderView("pramaan")).toBe("pramaan");
  for (const value of ["gocardless", "teller", "plaid", "enablebanking", null]) expect(bankProviderView(value)).toBe("legacy");
});
