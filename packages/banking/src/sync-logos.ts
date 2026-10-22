import { getCompanyLogo } from "@business-operations/storage/logos";
import type { InstitutionRecord } from "./institutions";

export async function syncInstitutionLogos(
  institutions: InstitutionRecord[],
  _options: { concurrency?: number; delayMs?: number } = {},
): Promise<{ uploaded: number; skipped: number; failed: number }> {
  const names = [...new Set(institutions.map(institution => institution.name))];
  let uploaded = 0;
  let failed = 0;
  for (const name of names) {
    try { await getCompanyLogo({ name }); uploaded++; }
    catch { failed++; }
  }
  return { uploaded, skipped: institutions.length - names.length, failed };
}
