import { pramaanFromEnv } from "@business-operations/pramaan";
import type { createLoggerWithContext } from "@business-operations/logger";
import { removeProtocolFromDomain } from "../utils";

/**
 * Lookup company domain using the platform web search capability
 * This function searches for the official website domain of a company by name
 *
 * @param companyName - The company/vendor name to lookup
 * @param logger - Optional logger instance for logging lookup attempts
 * @returns The domain name (e.g., "example.com") or null if not found/failed
 */
export async function lookupDomainByCompanyName(
  companyName: string | null | undefined,
  logger?: ReturnType<typeof createLoggerWithContext>,
): Promise<string | null> {
  // Validate input
  if (!companyName || companyName.trim().length === 0) {
    return null;
  }

  const cleanedCompanyName = companyName.trim();

  // Skip if company name is too short or looks invalid
  if (cleanedCompanyName.length < 2) {
    return null;
  }

  logger?.info("Attempting domain lookup", { companyName: cleanedCompanyName });

  try {
    const pramaan = pramaanFromEnv();
    if (!pramaan) {
      logger?.warn("Domain lookup skipped: search is not available");
      return null;
    }

    const result = await pramaan.webSearch({
      query: `${cleanedCompanyName} official website`,
      limit: 5,
    });

    // Pick the first result that yields a clean domain
    for (const entry of result.results ?? []) {
      const url =
        typeof entry.url === "string"
          ? entry.url
          : typeof entry.link === "string"
            ? entry.link
            : "";
      if (!url) continue;

      const domain = removeProtocolFromDomain(url);

      if (!domain || domain.includes("example.")) continue;

      logger?.info("Domain lookup successful", {
        companyName: cleanedCompanyName,
        domain,
      });

      return domain.toLowerCase();
    }

    logger?.info("Domain lookup returned no usable result", {
      companyName: cleanedCompanyName,
    });

    return null;
  } catch (error) {
    logger?.warn("Domain lookup failed", {
      companyName: cleanedCompanyName,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return null;
  }
}
