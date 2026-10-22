export type ManagedBackend = { status: "ready"; authUrl: string; jwksUrl: string };
export type ManagedIdentity = { valid: boolean; userId?: string; sessionId?: string | null; orgId?: string | null; expiresAt?: string };
export type ManagedDatabase = { status: "ready" | "paused" | "transferred" | "held"; created: boolean; connectionString?: string; directConnectionString?: string };
function object(raw: unknown): Record<string, unknown> { if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Managed service response could not be confirmed."); return raw as Record<string, unknown>; }
function address(raw: unknown) { if (typeof raw !== "string") throw new Error("Managed sign-in is not ready."); let url: URL; try { url = new URL(raw); } catch { throw new Error("Managed sign-in is not ready."); } if (url.protocol !== "https:" || url.username || url.password || url.hash) throw new Error("Managed sign-in is not ready."); return raw; }
export function managedBackend(raw: unknown): ManagedBackend { const row = object(raw); if (row.status !== "ready") throw new Error("Managed sign-in is not ready."); return { status: "ready", authUrl: address(row.authUrl), jwksUrl: address(row.jwksUrl) }; }
export function managedDomains(raw: unknown): { allowedDomains: string[] } {
  const row = object(raw); if (!Array.isArray(row.allowedDomains)) throw new Error("Managed sign-in address could not be confirmed.");
  return { allowedDomains: row.allowedDomains.map(item => { const value = typeof item === "string" ? item : object(item).domain; if (typeof value !== "string") throw new Error("Managed sign-in address could not be confirmed."); return value; }) };
}
export function managedIdentity(raw: unknown): ManagedIdentity {
  const row = object(raw); if (row.valid === false) return { valid: false };
  if (row.valid !== true || typeof row.userId !== "string" || !row.userId || row.userId.length > 512 || row.expiresAt !== undefined && (typeof row.expiresAt !== "string" || !Number.isFinite(Date.parse(row.expiresAt)))) throw new Error("Sign-in could not be confirmed.");
  for (const field of ["sessionId", "orgId"]) if (row[field] !== undefined && row[field] !== null && typeof row[field] !== "string") throw new Error("Sign-in could not be confirmed.");
  return { valid: true, userId: row.userId, ...(row.sessionId !== undefined ? { sessionId: row.sessionId as string | null } : {}), ...(row.orgId !== undefined ? { orgId: row.orgId as string | null } : {}), ...(typeof row.expiresAt === "string" ? { expiresAt: row.expiresAt } : {}) };
}
export function privateDatabaseAddress(raw: unknown): string {
  try { if (typeof raw !== "string" || /\s/.test(raw)) throw 0; const url = new URL(raw); if (url.protocol !== "postgresql:" || !url.hostname || !url.username || !url.password || url.pathname.length < 2 || url.hash) throw 0; return raw; }
  catch { throw new Error("Managed database credentials could not be confirmed."); }
}
export function managedDatabase(raw: unknown): ManagedDatabase {
  const row = object(raw); if (!["ready", "paused", "transferred", "held"].includes(String(row.status)) || typeof row.created !== "boolean") throw new Error("Managed database is not ready.");
  if (!row.created) { if (row.connectionString !== undefined || row.directConnectionString !== undefined) throw new Error("Managed database credentials could not be confirmed."); return { status: row.status as ManagedDatabase["status"], created: false }; }
  if (!["ready", "paused"].includes(String(row.status))) throw new Error("Managed database is not ready.");
  return { status: row.status as ManagedDatabase["status"], created: true, connectionString: privateDatabaseAddress(row.connectionString), directConnectionString: privateDatabaseAddress(row.directConnectionString) };
}

export type ManagedUser = { userId: string; email?: string; emailVerified?: boolean; name?: string; banned?: boolean };
export function managedUser(raw: unknown): ManagedUser {
  const row = object(raw);
  if (typeof row.userId !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(row.userId)) throw new Error("Sign-in identity could not be confirmed.");
  if (row.email !== undefined && (typeof row.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email))) throw new Error("Sign-in identity could not be confirmed.");
  for (const field of ["emailVerified", "banned"]) if (row[field] !== undefined && typeof row[field] !== "boolean") throw new Error("Sign-in identity could not be confirmed.");
  return { userId: row.userId, ...(typeof row.email === "string" ? { email: row.email } : {}), ...(typeof row.name === "string" ? { name: row.name.slice(0, 256) } : {}), ...(typeof row.emailVerified === "boolean" ? { emailVerified: row.emailVerified } : {}), ...(typeof row.banned === "boolean" ? { banned: row.banned } : {}) };
}
