import { expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { mkdtemp } from "node:fs/promises";
import path from "node:path";
import { FakePramaan } from "@business-operations/pramaan/fake";
import { verifyManagedSignIn, checkManagedState, saveManagedIdentity, renameManagedIdentity, deleteManagedIdentity } from "./managed-sign-in";
const authUrl = "https://signin.example.test/auth", app = "https://app.example.test";
const profile = { userId: "owned-person", email: "person@example.test", emailVerified: true, name: "Fixture person" };
const jwt = (claims: Record<string, unknown> = {}) => `e30.${Buffer.from(JSON.stringify({sub: profile.userId, email: profile.email, emailVerified: true, ...claims})).toString("base64url")}.fixture`;
const token = jwt();
function fake() { return new FakePramaan({"auth.token.verify": input => ({valid:(input as {token:string}).token === token,userId:"owned-person",expiresAt:"2099-01-01T00:00:00Z"}),"auth.user.get":()=>profile}); }
test("only verified owned identity opens the app account path", async () => {
 const p = fake(); const identity = await verifyManagedSignIn(token,authUrl,app,"person@example.test",p);
 expect(identity.managedUserId).toBe("owned-person");expect(identity.loginEmail).toMatch(/^[a-f0-9]{64}@identity.localhost$/);
 expect(p.callsTo("auth.token.verify")).toEqual([{token:token,audience:"https://signin.example.test",authorizedParties:[app]}]);
 await expect(verifyManagedSignIn("altered-token",authUrl,app,"",p)).rejects.toThrow("could not be confirmed");
 expect(p.callsTo("auth.user.get")).toHaveLength(0);
 p.route({"auth.token.verify":()=>({valid:true,userId:"owned-person",expiresAt:"2000-01-01T00:00:00Z"})});
 await expect(verifyManagedSignIn("old-token",authUrl,app,"",p)).rejects.toThrow("could not be confirmed");
});
test("allow-list and signed subject mismatch refuse sign-in", async () => {
 const p = fake();
 await expect(verifyManagedSignIn(token,authUrl,app,"someone-else@example.test",p)).rejects.toThrow("cannot sign in");
 p.route({"auth.token.verify":()=>({valid:true,userId:"owned-person"})});
 await expect(verifyManagedSignIn(jwt({emailVerified:false}),authUrl,app,"person@example.test",p)).rejects.toThrow("cannot sign in");
 await expect(verifyManagedSignIn(jwt({sub:"other-person"}),authUrl,app,"",p)).rejects.toThrow("could not be confirmed");
 await expect(verifyManagedSignIn("malformed",authUrl,app,"",p)).rejects.toThrow("could not be confirmed");
 await expect(verifyManagedSignIn(jwt({email:undefined}),authUrl,app,"",p)).rejects.toThrow("could not be confirmed");
});
test("email never links distinct managed identities, and state must match the browser cookie", async () => {
 const p = fake();const first = await verifyManagedSignIn(token,authUrl,app,"",p);
 p.route({"auth.token.verify":()=>({valid:true,userId:"another-person"}),"auth.user.get":()=>({...profile,userId:"another-person"})});
 expect((await verifyManagedSignIn(jwt({sub:"another-person"}),authUrl,app,"",p)).loginEmail).not.toBe(first.loginEmail);
 expect(()=>checkManagedState("a".repeat(43),"a".repeat(43))).not.toThrow();
 expect(()=>checkManagedState("a".repeat(43),"b".repeat(43))).toThrow();expect(()=>checkManagedState(undefined,"a".repeat(43))).toThrow();
});
test("managed profile changes use a server-owned binding and stable deletion identity", async () => {
 const previousRoot=process.env.STORAGE_ROOT, previousAuth=process.env.MANAGED_AUTH_URL;
 process.env.STORAGE_ROOT=await mkdtemp(path.resolve(__dirname,"../../../.scratch/managed-binding-"));process.env.MANAGED_AUTH_URL=authUrl;
 const localId=randomUUID();const p = new FakePramaan({"auth.user.update":()=>({...profile,name:"Renamed"}),"auth.user.delete":()=>({deleted:true})});
 try {
  await saveManagedIdentity(localId,{userId:"owned-person",authOrigin:new URL(authUrl).origin});
  await renameManagedIdentity(localId,"Renamed",p);await deleteManagedIdentity(localId,p);
  expect(p.callsTo("auth.user.update")).toEqual([{userId:"owned-person",name:"Renamed"}]);expect(p.callsTo("auth.user.delete")).toEqual([{userId:"owned-person",confirm:true}]);
  const deletionKey = p.calls.find(call=>call.id==="auth.user.delete")!.opts!.idempotencyKey;
  await deleteManagedIdentity(localId,p);
  expect(p.calls.filter(call=>call.id==="auth.user.delete").map(call=>call.opts!.idempotencyKey)).toEqual([deletionKey,deletionKey]);
  process.env.MANAGED_AUTH_URL="https://other.example.test/auth";
  await expect(deleteManagedIdentity(localId,p)).rejects.toThrow("not configured");expect(p.callsTo("auth.user.delete")).toHaveLength(2);
 } finally { if(previousRoot===undefined)delete process.env.STORAGE_ROOT;else process.env.STORAGE_ROOT=previousRoot;if(previousAuth===undefined)delete process.env.MANAGED_AUTH_URL;else process.env.MANAGED_AUTH_URL=previousAuth; }
});
