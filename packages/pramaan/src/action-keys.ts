import { capabilityInfo } from "./catalog";
import { PramaanError } from "./sdk/errors";
export const ACTION_KEY_REQUIRED = "Idempotency-Key header is required for this capability.";
export function actionKeyRequired(id: string) {
  const info = capabilityInfo(id);
  return !!info && info.effectClass !== "read_only";
}
export function checkActionKey(id: string, key: string | null | undefined) {
  if (actionKeyRequired(id) && !key?.trim()) throw new PramaanError("invalid_request", ACTION_KEY_REQUIRED, { status: 400 });
}
