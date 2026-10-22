import { APPS_CONTRACTS } from "./apps-contracts";
import { matches } from "./banking-validation";
import { PramaanError } from "./sdk/errors";
export function validateApps(id: string, kind: "input" | "result", value: unknown) {
  const contract = APPS_CONTRACTS[id as keyof typeof APPS_CONTRACTS];
  if (contract && !matches(value, contract[kind])) throw new PramaanError(kind === "input" ? "invalid_request" : "internal", "The connected app request could not be confirmed.");
}
