import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { requirePramaan, type Pramaan } from "@business-operations/pramaan";
import { getObject, putObject } from "./index";
type SignIn = { id: string; state: string; nonce: string; verifier: string; redirectUri: string; providerKey: string; connectionRef?: string; expiresAt: number; consumed: boolean };
type Identity = { providerKey: string; subjectId: string; emailVerified: boolean; email?: string; displayName?: string };
const token = () => randomBytes(32).toString("base64url");
function key(id: string) { if (!/^[A-Za-z0-9_-]{43}$/.test(id)) throw new Error("Sign-in expired. Start again."); return `${id}.json`; }
async function save(value: SignIn) { await putObject({ bucket: "sign-in", path: key(value.id), data: JSON.stringify(value) }); }
export async function enterpriseConnections(organizationRef: string, client: Pramaan = requirePramaan()) {
  const results: { ref?: string; name: string; organizationRef: string; status: "ready" }[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < 100; page++) {
    const response = await client.authEnterpriseConnectionsList({ organizationRef, cursor, limit: 50 }) as { results: typeof results; nextCursor?: string };
    results.push(...response.results.filter(row => row.organizationRef === organizationRef && row.status === "ready"));
    if (!response.nextCursor) return results;
    if (cursor === response.nextCursor) throw new Error("Sign-in connections could not be confirmed.");
    cursor = response.nextCursor;
  }
  throw new Error("Sign-in connections could not be confirmed.");
}
export async function startFederatedSignIn(config: { redirectUri: string; providerKey: string; connectionRef?: string; authorizationUrl?: string; clientId?: string; scope?: string }, client: Pramaan = requirePramaan()) {
  const value: SignIn = { id: token(), state: token(), nonce: token(), verifier: token(), redirectUri: config.redirectUri,
    providerKey: config.connectionRef ? "enterprise" : config.providerKey, connectionRef: config.connectionRef, expiresAt: Date.now() + 10 * 60000, consumed: false };
  const challenge = createHash("sha256").update(value.verifier).digest("base64url");
  let authorizationUrl: string;
  if (config.connectionRef) {
    const result = await client.authEnterpriseStart({ connectionRef: config.connectionRef, redirectUri: value.redirectUri, state: value.state, nonce: value.nonce, codeChallenge: challenge }) as { authorizationUrl: string; expiresAt: string };
    authorizationUrl = result.authorizationUrl;
    value.expiresAt = Math.min(value.expiresAt, Date.parse(result.expiresAt));
  } else {
    if (!config.authorizationUrl || !config.clientId) throw new Error("Social sign-in is not set up yet.");
    const url = new URL(config.authorizationUrl);
    if (url.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(url.hostname)) throw new Error("Social sign-in is not set up yet.");
    for (const [key, item] of Object.entries({ response_type: "code", client_id: config.clientId, redirect_uri: value.redirectUri, scope: config.scope || "openid profile email", state: value.state, nonce: value.nonce, code_challenge: challenge, code_challenge_method: "S256" })) url.searchParams.set(key, item);
    authorizationUrl = url.href;
  }
  await save(value);
  return { id: value.id, authorizationUrl };
}
export async function finishFederatedSignIn(id: string, state: string, code: string, client: Pramaan = requirePramaan()) {
  const file = await getObject({ bucket: "sign-in", path: key(id) });
  if (!file) throw new Error("Sign-in expired. Start again.");
  const value = JSON.parse(file.data.toString()) as SignIn;
  const supplied = Buffer.from(state);
  const expected = Buffer.from(value.state);
  if (value.consumed || value.expiresAt <= Date.now() || !Number.isFinite(value.expiresAt) || supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) throw new Error("Sign-in expired. Start again.");
  value.consumed = true; await save(value);
  const identity = await client.authSocialExchange({ providerKey: value.providerKey, code, redirectUri: value.redirectUri, pkceVerifier: value.verifier, expectedNonce: value.nonce,
    ...(value.connectionRef ? { connectionRef: value.connectionRef, state: value.state } : {}) }) as Identity;
  if (identity.providerKey !== value.providerKey || !identity.subjectId) throw new Error("Sign-in identity could not be confirmed.");
  // An email claim never identifies or links an existing account.
  const identityKey = createHash("sha256").update(JSON.stringify([value.providerKey, value.connectionRef || "", identity.subjectId])).digest("hex");
  return { identityKey, loginEmail: `${identityKey}@identity.localhost`, displayName: identity.displayName, claimedEmail: identity.email, emailVerified: identity.emailVerified };
}
