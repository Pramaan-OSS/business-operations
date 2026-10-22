export function getWebsiteLogo(website?: string | null) {
  if (!website) return "";

  try {
    const domain = new URL(website.includes("://") ? website : `https://${website}`).hostname.toLowerCase();
    return `/api/logo?domain=${encodeURIComponent(domain)}`;
  } catch { return ""; }
}
