import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { requirePramaan, type Pramaan } from "@business-operations/pramaan";
import { getObject, putObject } from "./index";
export function checkManagedState(expected: string | undefined, supplied: unknown) {
  if (!expected || typeof supplied !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(expected)) throw new Error("Sign-in expired. Start again.");
  const left = Buffer.from(expected), right = Buffer.from(supplied);
  if (left.length !== right.length || !timingSafeEqual(left, right)) throw new Error("Sign-in expired. Start again.");
}
export async function verifyManagedSignIn(token: string, authUrl: string, appUrl: string, allowed = "", client: Pramaan = requirePramaan()) {
  if (!token || token.length > 8192) throw new Error("Sign-in could not be confirmed.");
  const origin = new URL(authUrl).origin;
  const result = await client.authTokenVerify({ token, audience: origin, authorizedParties: [new URL(appUrl).origin] });
  if (!result.valid || !result.userId || result.expiresAt && Date.parse(result.expiresAt) <= Date.now()) throw new Error("Sign-in could not be confirmed.");
  let claims: Record<string, unknown>;
  try {
    const parts = token.split(".");
    if (parts.length !== 3 || !/^[A-Za-z0-9_-]+$/.test(parts[1]!)) throw 0;
    claims = JSON.parse(Buffer.from(parts[1]!, "base64url").toString("utf8"));
    if (!claims || typeof claims !== "object" || Array.isArray(claims) || claims.sub !== result.userId) throw 0;
    if (typeof claims.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(claims.email)) throw 0;
  } catch { throw new Error("Sign-in could not be confirmed."); }
  const user = { userId: result.userId, email: claims.email as string, emailVerified: claims.emailVerified === true || claims.email_verified === true, name: typeof claims.name === "string" ? claims.name.slice(0, 256) : undefined };
  const allowList = allowed.split(",").map(value => value.trim().toLowerCase()).filter(Boolean);
  if (allowList.length && (!user.emailVerified || !user.email || !allowList.includes(user.email.toLowerCase()))) throw new Error("This account cannot sign in to this app.");
  const identityKey = createHash("sha256").update(JSON.stringify([origin, user.userId])).digest("hex");
  return { identityKey, loginEmail: `${identityKey}@identity.localhost`, managedUserId: user.userId, authOrigin: origin, email: user.email, emailVerified: user.emailVerified === true, displayName: user.name };
}
type Binding = { userId: string; authOrigin: string };
const validLocalId = (id: string) => /^[a-f0-9-]{36}$/i.test(id);
export async function saveManagedIdentity(localId: string, binding: Binding) {
  if (!validLocalId(localId)) throw new Error("Sign-in could not be confirmed.");
  await putObject({ bucket: "managed-identities", path: `${localId}.json`, data: JSON.stringify(binding) });
}
async function binding(localId: string): Promise<Binding | undefined> {
  if (!validLocalId(localId)) return;
  const file = await getObject({ bucket: "managed-identities", path: `${localId}.json` });
  if (!file) return;
  const value = JSON.parse(file.data.toString()) as Binding;
  if (value.authOrigin !== new URL(process.env.MANAGED_AUTH_URL || "https://unconfigured.invalid").origin || !/^[A-Za-z0-9_-]{1,128}$/.test(value.userId)) throw new Error("This managed account is not configured for this installation.");
  return value;
}
export async function renameManagedIdentity(localId: string, name: string, client?: Pramaan) {
  const value = await binding(localId); if (!value) return;
  await (client ?? requirePramaan()).authUserUpdate(value.userId, name, { idempotencyKey: randomUUID() });
}
export async function deleteManagedIdentity(localId: string, client?: Pramaan) {
  const value = await binding(localId); if (!value) return;
  await (client ?? requirePramaan()).authUserDelete(value.userId, { idempotencyKey: `delete-managed-${localId}` });
}
