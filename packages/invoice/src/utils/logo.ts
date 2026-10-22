export async function isValidLogoUrl(url: string): Promise<boolean> {
  try {
    const parsed = new URL(url);
    const base = new URL(process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002");
    if (parsed.origin !== base.origin || parsed.pathname !== "/files/signed" || parsed.username || parsed.password) return false;
    const response = await fetch(parsed, { method: "HEAD", redirect: "error", signal: AbortSignal.timeout(5000) });
    return response.ok;
  } catch { return false; }
}
