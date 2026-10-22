export const BANK_RETURN_ADDRESS_NOTICE = "Bank connections are not available at a local address. Use this app’s public HTTPS address. Local imports remain available.";
export function publicBankReturnAddress(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && url.hostname.includes(".") &&
      !url.hostname.endsWith(".localhost") && !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) &&
      !/^\d+\.\d+\.\d+\.\d+$/.test(url.hostname);
  } catch { return false; }
}
export class BankReturnAddressError extends Error {
  constructor() { super(BANK_RETURN_ADDRESS_NOTICE); }
}
