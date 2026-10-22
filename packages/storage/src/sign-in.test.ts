import { test, expect } from "bun:test";
import { mkdir, mkdtemp } from "node:fs/promises";
import path from "node:path";
import { FakePramaan } from "@business-operations/pramaan/fake";
import { enterpriseConnections, startFederatedSignIn, finishFederatedSignIn } from "./sign-in";
test("federated sign-in binds state and proof to one use; matching email never links accounts", async () => {
  const scratch = path.resolve(__dirname, "../../../.scratch");
  await mkdir(scratch, { recursive: true });
  const previous = process.env.STORAGE_ROOT;
  process.env.STORAGE_ROOT = await mkdtemp(`${scratch}/sign-in-`);
  const ref = `ref_${"0".repeat(26)}`;
  let state = "";
  let nonce = "";
  const fake = new FakePramaan({
    "auth.enterprise-connections.list": () => ({ results: [{ organizationRef: "business", name: "Team sign-in", status: "ready", createdAt: "2026-10-15", ref }, { organizationRef: "other", name: "Other", status: "ready", createdAt: "2026-10-15" }] }),
    "auth.enterprise.start": input => { const request = input as { state: string; nonce: string; codeChallenge: string }; state = request.state; nonce = request.nonce; expect(request.codeChallenge).toHaveLength(43); return { authorizationUrl: "https://example.test/sign-in", expiresAt: "2099-01-01T00:00:00Z" }; },
    "auth.social.exchange": () => ({ providerKey: "enterprise", subjectId: "person-one", email: "same@example.test", emailVerified: true }),
  });
  try {
    expect(await enterpriseConnections("business", fake)).toHaveLength(1);
    const first = await startFederatedSignIn({ providerKey: "enterprise", connectionRef: ref, redirectUri: "https://app.example.test/api/auth/federated/callback" }, fake);
    await expect(finishFederatedSignIn(first.id, "wrong", "code", fake)).rejects.toThrow("expired");
    expect(fake.callsTo("auth.social.exchange")).toHaveLength(0);
    const identity = await finishFederatedSignIn(first.id, state, "code", fake);
    expect(identity.loginEmail).not.toBe("same@example.test");
    expect(fake.callsTo("auth.social.exchange")[0]).toMatchObject({ connectionRef: ref, state, expectedNonce: nonce });
    await expect(finishFederatedSignIn(first.id, state, "code", fake)).rejects.toThrow("expired");
    const next = await startFederatedSignIn({ providerKey: "enterprise", connectionRef: `ref_${"1".repeat(26)}`, redirectUri: "https://app.example.test/api/auth/federated/callback" }, fake);
    expect((await finishFederatedSignIn(next.id, state, "another-code", fake)).identityKey).not.toBe(identity.identityKey);
    const social = await startFederatedSignIn({ providerKey: "test", redirectUri: "https://app.example.test/callback", authorizationUrl: "https://example.test/authorize", clientId: "public-client-id" }, fake);
    const url = new URL(social.authorizationUrl);
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("nonce")).toHaveLength(43);
  } finally { if (previous === undefined) delete process.env.STORAGE_ROOT; else process.env.STORAGE_ROOT = previous; }
});
