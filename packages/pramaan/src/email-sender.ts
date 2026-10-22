export const DEFAULT_EMAIL_SENDER = "Business Operations <noreply@updates.pramaan.one>";
/** An explicitly configured connected sender can override the platform sender. */
export function emailSender(explicit?: string): string {
  return explicit?.trim() || process.env.EMAIL_FROM?.trim() || DEFAULT_EMAIL_SENDER;
}
