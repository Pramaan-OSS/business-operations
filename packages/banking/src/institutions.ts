import { requirePramaan } from "@business-operations/pramaan";
export type InstitutionRecord = { id: string; name: string; logo: string | null; sourceLogo: string | null;
  provider: "pramaan"; countries: string[]; availableHistory: number | null; maximumConsentValidity: number | null; popularity: number; type: string | null };
export type FetchInstitutionsResult = { institutions: InstitutionRecord[]; errors: { provider: string; error: string }[]; succeededProviders: ["pramaan"] };
export async function fetchAllInstitutions(): Promise<FetchInstitutionsResult> {
  const countries = (process.env.BANK_COUNTRIES || "GB").split(",").map(value => value.trim().toUpperCase());
  const institutions: InstitutionRecord[] = [];
  for (const country of countries) {
    let cursor: string | undefined;
    for (let page = 0; page < 100; page++) {
      const result = await requirePramaan().bankingInstitutionsSearch({ country, cursor, limit: 100 });
      for (const row of result.institutions) {
        if (!row.rowRef) continue;
        institutions.push({ id: row.rowRef, name: row.name, logo: `/api/logo?name=${encodeURIComponent(row.name)}`, sourceLogo: null,
          provider: "pramaan", countries: [...row.countries], availableHistory: null, maximumConsentValidity: null, popularity: 0, type: null });
      }
      if (!result.nextCursor) break;
      if (result.nextCursor === cursor) throw new Error("The bank list is incomplete.");
      cursor = result.nextCursor;
    }
  }
  return { institutions, errors: [], succeededProviders: ["pramaan"] };
}
