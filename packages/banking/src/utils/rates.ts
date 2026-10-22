import { requirePramaan, type Pramaan } from "@business-operations/pramaan";
import { uniqueCurrencies } from "@business-operations/location/currencies";

export async function getRates(currencies: string[] = uniqueCurrencies, client: Pramaan = requirePramaan()) {
  const rates: Record<string, number> = { USD: 1 };
  const dates: string[] = [];
  for (const currency of [...new Set(currencies.map(code => code.toUpperCase()))]) {
    if (currency === "USD") continue;
    const result = await client.financeExchangeRateGet({ from: "USD", to: currency });
    if (!Number.isFinite(result.rate) || result.rate <= 0 || !result.date) throw new Error("Exchange rates are not available yet.");
    rates[currency] = result.rate;
    dates.push(result.date);
  }
  const date = dates.sort()[0] || new Date().toISOString().slice(0, 10);
  return Object.entries(rates).map(([source, sourceRate]) => ({ source, date,
    rates: Object.fromEntries(Object.entries(rates).map(([target, targetRate]) => [target, targetRate / sourceRate])) }));
}
