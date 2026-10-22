import { PramaanError } from "./sdk/errors";

export type HostedFile = {
  fileId: string;
  url: string;
  expiresAt: string;
  contentType: string;
  sizeBytes: number;
};
export type LogoResult = {
  file: HostedFile;
  /** Permission to generate a monogram; this does not establish authenticity. */
  placeholderAllowed: boolean;
  sourceWidth?: number;
  sourceHeight?: number;
  sourceFormat?: "png" | "jpg" | "svg" | "webp" | "gif" | "ico" | "avif";
  sourceHasTransparency?: boolean;
  sourceIsVector?: boolean;
  placeholderHash?: string;
};
export const MAX_LOGO_BYTES = 10 * 1024 * 1024;
const invalid = (): never => { throw new PramaanError("internal", "Could not confirm the logo file."); };

export function validateLogoResult(value: unknown): LogoResult {
  if (!value || typeof value !== "object") return invalid();
  const result = value as LogoResult;
  const file = result.file;
  if (!file || typeof file !== "object" || typeof file.fileId !== "string" ||
      !/^file_[0-9A-HJKMNP-TV-Z]{26}$/.test(file.fileId) || typeof file.url !== "string" ||
      typeof file.expiresAt !== "string" || !/^\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/.test(file.expiresAt) ||
      !Number.isFinite(Date.parse(file.expiresAt)) || typeof file.contentType !== "string" ||
      !file.contentType.startsWith("image/") || !Number.isInteger(file.sizeBytes) ||
      file.sizeBytes < 1 || file.sizeBytes > MAX_LOGO_BYTES || typeof result.placeholderAllowed !== "boolean") return invalid();
  try {
    const url = new URL(file.url);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return invalid();
  } catch { return invalid(); }
  for (const key of ["sourceWidth", "sourceHeight"] as const)
    if (result[key] !== undefined && (!Number.isInteger(result[key]) || result[key]! < 1)) return invalid();
  for (const key of ["sourceHasTransparency", "sourceIsVector"] as const)
    if (result[key] !== undefined && typeof result[key] !== "boolean") return invalid();
  if (result.sourceFormat !== undefined && !["png", "jpg", "svg", "webp", "gif", "ico", "avif"].includes(result.sourceFormat)) return invalid();
  if (result.placeholderHash !== undefined && typeof result.placeholderHash !== "string") return invalid();
  return result;
}
