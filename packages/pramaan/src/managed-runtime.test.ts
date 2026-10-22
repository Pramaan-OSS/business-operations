import { expect, test } from "bun:test";
import { mkdtemp, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { FakePramaan } from "./fake";
import { PramaanError } from "./index";
import { ManagedRuntime, DATABASE_FALLBACK } from "./managed-runtime";
const backend = { status: "ready", authUrl: "https://signin.example.test/auth", jwksUrl: "https://signin.example.test/auth/jwks" };
const connectionString = "postgresql://app:private-test-value@db.example.test/app?sslmode=require";
const directory = () => mkdtemp(path.resolve(__dirname, "../../../.scratch/managed-"));
test("provision and reuse managed services without repeating credential disclosure", async () => {
 const dir = await directory();
 const p = new FakePramaan({ "auth.backend.provision": () => backend, "auth.backend.domains.set": () => ({ allowedDomains: [{ domain: "https://app.example.test" }] }), "db.postgres.provision": () => ({ status: "ready", created: true, connectionString, directConnectionString: connectionString }) });
 const runtime = new ManagedRuntime(p, dir, "fixture-key");
 expect(await runtime.backend("https://app.example.test")).toEqual(backend);
 expect(await runtime.database("local")).toMatchObject({ mode: "managed", connectionString });
 const again = new ManagedRuntime(p, dir, "fixture-key");
 await again.backend("https://app.example.test"); await again.database("local");
 expect(p.callsTo("auth.backend.provision")).toHaveLength(1);expect(p.callsTo("auth.backend.domains.set")).toHaveLength(1);expect(p.callsTo("db.postgres.provision")).toHaveLength(1);
 const files = await Array.fromAsync(new Bun.Glob("*.json").scan(dir));
 expect(files).toHaveLength(1); expect((await stat(path.join(dir, files[0]!))).mode & 0o777).toBe(0o600);
 expect(JSON.parse(await readFile(path.join(dir, files[0]!), "utf8")).database.connectionString).toBe(connectionString);
});
test("only the declared unavailable result falls back to the same local connection path", async () => {
 const p = new FakePramaan({ "db.postgres.provision": () => {throw new PramaanError("upstream_unavailable", "Private upstream detail");} });
 const runtime = new ManagedRuntime(p, await directory(), "fixture-key");
 expect(await runtime.database("local")).toEqual({ mode: "local", connectionString: "local", directConnectionString: "local", startupMessage: DATABASE_FALLBACK });
 await runtime.database("local");expect(p.callsTo("db.postgres.provision")).toHaveLength(2);
});
test("uncertain starts and lost once-only credentials do not silently reprovision", async () => {
 const p = new FakePramaan({ "db.postgres.provision": () => {throw new PramaanError("upstream_timeout", connectionString);} });
 const runtime = new ManagedRuntime(p, await directory(), "fixture-key");
 await expect(runtime.database("local")).rejects.toThrow("could not be confirmed");
 await expect(runtime.database("local")).rejects.toThrow("recovery");expect(p.callsTo("db.postgres.provision")).toHaveLength(1);
});
test("the client validates verified and refused tokens, and refuses malformed identities", async () => {
 const p = new FakePramaan({"auth.token.verify": input => (input as {token:string}).token === "signed-token" ? { valid: true, userId: "managed-person", sessionId: "managed-session", orgId: null, expiresAt: "2099-01-01T00:00:00Z" } : { valid: false, userId: "untrusted" }});
 expect(await p.authTokenVerify({ token: "signed-token" })).toMatchObject({ valid: true, userId: "managed-person", sessionId: "managed-session", orgId: null });
 expect(await p.authTokenVerify({ token: "changed-token" })).toEqual({ valid: false });
 p.route({"auth.token.verify": () => ({valid: true})}); await expect(p.authTokenVerify({token:"malformed"})).rejects.toThrow("could not be confirmed");
});

test("local origins skip registration and unavailable sign-in uses the local fallback", async () => {
 const p = new FakePramaan({ "auth.backend.provision": () => backend });
 const runtime = new ManagedRuntime(p, await directory(), "local-key");
 expect(await runtime.signIn("http://localhost:3001")).toMatchObject({ mode: "managed", authUrl: backend.authUrl });
 expect(p.callsTo("auth.backend.domains.set")).toHaveLength(0);
 const unavailable = new FakePramaan({ "auth.backend.provision": () => { throw new PramaanError("upstream_unavailable", "Private detail"); } });
 expect(await new ManagedRuntime(unavailable, await directory(), "key").signIn("http://localhost:3001")).toMatchObject({ mode: "local" });
});

test("sign-in and domain request identities survive refusals and a process restart", async () => {
 const dir = await directory();
 const p = new FakePramaan({"auth.backend.provision":()=>{throw new PramaanError("invalid_request","Idempotency-Key header is required for this capability. private-detail");}});
 const first = new ManagedRuntime(p,dir,"persistent-key");
 await expect(first.signIn("https://app.example.test")).rejects.toThrow("A request ID header is required");
 const firstId = p.calls[0]!.opts!.idempotencyKey!;
 expect(firstId).toMatch(/^managed-signin-/);
 const stateFile = Array.from(new Bun.Glob("*.json").scanSync(dir))[0]!;
 expect(JSON.parse(await readFile(path.join(dir,stateFile),"utf8")).backendRequest).toBe(firstId);
 p.route({"auth.backend.provision":()=>backend,"auth.backend.domains.set":()=>{throw new PramaanError("upstream_timeout","private-detail");}});
 await expect(new ManagedRuntime(p,dir,"persistent-key").signIn("https://app.example.test")).rejects.toThrow("timed out");
 expect(p.calls[1]!.opts!.idempotencyKey).toBe(firstId);
 const domainId = p.calls[2]!.opts!.idempotencyKey!;
 p.route({"auth.backend.domains.set":()=>({allowedDomains:["https://app.example.test"]})});
 await new ManagedRuntime(p,dir,"persistent-key").signIn("https://app.example.test");
 expect(p.calls[3]!.opts!.idempotencyKey).toBe(domainId);
 expect(p.callsTo("auth.backend.provision")).toHaveLength(2);
});
test("database request identities persist through a known refusal or unavailable fallback", async () => {
 const dir=await directory();
 const p=new FakePramaan({"db.postgres.provision":()=>{throw new PramaanError("invalid_request","Idempotency-Key header is required for this capability. private-detail");}});
 try { await new ManagedRuntime(p,dir,"key").database("local");throw new Error("Expected refusal"); }
 catch(error) {expect((error as Error).message).toContain("invalid_request");expect((error as Error).message).toContain("A request ID header is required");expect((error as Error).message).not.toContain("private-detail");}
 const id=p.calls[0]!.opts!.idempotencyKey;
 p.route({"db.postgres.provision":()=>{throw new PramaanError("upstream_unavailable","private-detail");}});
 await new ManagedRuntime(p,dir,"key").database("local");
 expect(p.calls[1]!.opts!.idempotencyKey).toBe(id);
 await new ManagedRuntime(p,dir,"key").database("local");expect(p.calls[2]!.opts!.idempotencyKey).toBe(id);
});

test("an existing database without credentials explains recovery and is never reprovisioned", async () => {
 const p = new FakePramaan({ "db.postgres.provision": () => ({ status: "ready", created: false }) });
 const runtime = new ManagedRuntime(p, await directory(), "key");
 await expect(runtime.database("local")).rejects.toThrow("already exists, but its credentials were not returned");
 await expect(runtime.database("local")).rejects.toThrow("recovery");
 expect(p.callsTo("db.postgres.provision")).toHaveLength(1);
});
