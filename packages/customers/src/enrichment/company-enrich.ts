import { requirePramaan, type Pramaan, PramaanError } from "@business-operations/pramaan";
import type { CustomerEnrichmentResult, employeeCountOptions, industryOptions } from "./schema";

// Only fields documented by companies.enrich are accepted.
export type CompanyProfile = {
  name: string;
  domain?: string;
  description?: string;
  industry?: string;
  employeeCount?: number;
  foundedYear?: number;
  location?: { country?: string; region?: string; city?: string };
  linkedinUrl?: string;
};
export type LookupResult = { data: CompanyProfile; matchedByDomain: boolean };

export async function lookupCompany(
  name: string,
  domain: string | null,
  options: { signal?: AbortSignal; client?: Pramaan } = {},
): Promise<LookupResult | null> {
  options.signal?.throwIfAborted();
  const client = options.client ?? requirePramaan();
  let onAbort: () => void = () => {};
  const cancelled = new Promise<never>((_, reject) => {
    onAbort = () => reject(new Error("The request was cancelled or timed out."));
    options.signal?.addEventListener("abort", onAbort, { once: true });
    if (options.signal?.aborted) onAbort();
  });
  try {
    const response = await Promise.race([
      client.companiesEnrich(domain ? { domain } : { name }), cancelled,
    ]);
    options.signal?.throwIfAborted();
    if (!response || typeof response !== "object" || typeof (response as CompanyProfile).name !== "string")
      throw new PramaanError("internal", "Could not confirm the company profile.");
    const data = response as CompanyProfile;
    return { data, matchedByDomain: !!domain && data.domain?.toLowerCase() === domain.toLowerCase() };
  } catch (error) {
    if (error instanceof PramaanError && error.code === "not_found") return null;
    throw error;
  } finally {
    options.signal?.removeEventListener("abort", onAbort);
  }
}

export function mapToSchema(res: CompanyProfile): CustomerEnrichmentResult {
  const country = res.location?.country ?? null;
  const city = res.location?.city ?? null;
  return {
    description: res.description?.trim() || null,
    industry: mapIndustry(res.industry ?? null),
    companyType: null,
    employeeCount: employeeBand(res.employeeCount),
    foundedYear: res.foundedYear ?? null,
    estimatedRevenue: null,
    fundingStage: null,
    totalFunding: null,
    headquartersLocation: city && country ? `${city}, ${country}` : null,
    addressLine1: null,
    city,
    state: res.location?.region ?? null,
    zipCode: null,
    country,
    timezone: deriveTimezone(country),
    linkedinUrl: res.linkedinUrl || null,
    twitterUrl: null,
    instagramUrl: null,
    facebookUrl: null,
    ceoName: null,
    financeContact: null,
    financeContactEmail: null,
    primaryLanguage: deriveLanguage(country),
    fiscalYearEnd: null,
    vatNumber: null,
  };
}

function employeeBand(count?: number): (typeof employeeCountOptions)[number] | null {
  if (count === undefined || !Number.isFinite(count) || count < 1) return null;
  if (count <= 10) return "1-10";
  if (count <= 50) return "11-50";
  if (count <= 200) return "51-200";
  if (count <= 500) return "201-500";
  if (count <= 1000) return "501-1000";
  return "1000+";
}

const INDUSTRY_MAP: Record<string, (typeof industryOptions)[number]> = {
  software: "Software",
  "media & internet": "Media",
  media: "Media",
  finance: "Finance",
  healthcare: "Healthcare",
  "health care": "Healthcare",
  education: "Education",
  "real estate": "Real Estate",
  manufacturing: "Manufacturing",
  retail: "Retail",
  hospitality: "Hospitality",
  energy: "Energy",
  "business services": "Consulting",
  legal: "Legal",
  logistics: "Logistics",
  transportation: "Logistics",
  "consumer goods": "E-commerce",
};

function mapIndustry(
  industry: string | null,
): (typeof industryOptions)[number] | null {
  if (!industry) return null;
  const lower = industry.toLowerCase();
  if (INDUSTRY_MAP[lower]) return INDUSTRY_MAP[lower];
  for (const [key, value] of Object.entries(INDUSTRY_MAP)) {
    if (lower.includes(key)) return value;
  }
  return "Other";
}

const COUNTRY_TIMEZONE: Record<string, string> = {
  SE: "Europe/Stockholm",
  NO: "Europe/Oslo",
  DK: "Europe/Copenhagen",
  FI: "Europe/Helsinki",
  GB: "Europe/London",
  DE: "Europe/Berlin",
  FR: "Europe/Paris",
  NL: "Europe/Amsterdam",
  ES: "Europe/Madrid",
  IT: "Europe/Rome",
  AT: "Europe/Vienna",
  CH: "Europe/Zurich",
  BE: "Europe/Brussels",
  IE: "Europe/Dublin",
  PT: "Europe/Lisbon",
  PL: "Europe/Warsaw",
  CZ: "Europe/Prague",
  RO: "Europe/Bucharest",
  US: "America/New_York",
  CA: "America/Toronto",
  BR: "America/Sao_Paulo",
  MX: "America/Mexico_City",
  JP: "Asia/Tokyo",
  KR: "Asia/Seoul",
  CN: "Asia/Shanghai",
  IN: "Asia/Kolkata",
  AU: "Australia/Sydney",
  NZ: "Pacific/Auckland",
  SG: "Asia/Singapore",
  IL: "Asia/Jerusalem",
  AE: "Asia/Dubai",
  EE: "Europe/Tallinn",
  LV: "Europe/Riga",
  LT: "Europe/Vilnius",
};

export function deriveTimezone(countryCode: string | null): string | null {
  if (!countryCode) return null;
  return COUNTRY_TIMEZONE[countryCode.toUpperCase()] ?? null;
}

const COUNTRY_LANGUAGE: Record<string, string> = {
  SE: "Swedish",
  NO: "Norwegian",
  DK: "Danish",
  FI: "Finnish",
  GB: "English",
  US: "English",
  CA: "English",
  AU: "English",
  NZ: "English",
  IE: "English",
  DE: "German",
  AT: "German",
  CH: "German",
  FR: "French",
  BE: "French",
  NL: "Dutch",
  ES: "Spanish",
  MX: "Spanish",
  IT: "Italian",
  PT: "Portuguese",
  BR: "Portuguese",
  PL: "Polish",
  CZ: "Czech",
  RO: "Romanian",
  JP: "Japanese",
  KR: "Korean",
  CN: "Chinese",
  IN: "English",
  SG: "English",
  IL: "Hebrew",
  AE: "Arabic",
  EE: "Estonian",
  LV: "Latvian",
  LT: "Lithuanian",
};

export function deriveLanguage(countryCode: string | null): string | null {
  if (!countryCode) return null;
  return COUNTRY_LANGUAGE[countryCode.toUpperCase()] ?? null;
}
