/** Keep sign-in returns inside this app, including search and consent details. */
export function signInReturnPath(input: unknown): string {
  if (typeof input !== "string" || !input.trim() || input.length > 4096 || hasControlCharacters(input)) return "/";
  const raw = input.trim();
  if (/^[a-z][a-z0-9+.-]*:/i.test(raw)) return "/";
  const value = raw.startsWith("/") ? raw : `/${raw}`;
  try {
    let decoded = value;
    for (let i = 0; i < 3; i++) {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    }
    if (decoded.startsWith("//") || (decoded.includes("\\") || hasControlCharacters(decoded))) return "/";
    const url = new URL(value, "http://sign-in.local");
    if (url.origin !== "http://sign-in.local") return "/";
    if (/^\/(?:login|managed-return)(?:\/|$)/.test(decodeURIComponent(url.pathname)) || /^\/api\/auth(?:\/|$)/.test(decodeURIComponent(url.pathname))) return "/";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch { return "/"; }
}

function hasControlCharacters(value: string): boolean {
  return [...value].some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127);
}
