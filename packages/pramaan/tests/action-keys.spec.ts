import { expect, test } from "bun:test";
import { createPramaan, PramaanError } from "../src/index";
import { FakePramaan } from "../src/fake";
import { demoFetch } from "../src/demo-transport";
import { CATALOG } from "../src/catalog";
import { ACTION_KEY_REQUIRED } from "../src/action-keys";
const actions = Object.values(CATALOG).filter(row => row.effectClass !== "read_only").map(row => row.id);
test("every declared action rejects a missing or blank request header in the offline HTTP transport", async () => {
 for (const id of actions) for (const key of [undefined, " "]) {
  const response = await demoFetch(`https://example.test/v1/capabilities/${id}`, {method:"POST",body:"{}",headers:key===undefined?{}:{"Idempotency-Key":key}});
  expect(response.status).toBe(400);expect(await response.json()).toEqual({error:{code:"invalid_request",message:ACTION_KEY_REQUIRED}});
 }
});
test("the routed fake refuses managed actions before invoking their handlers", async () => {
 let reached = 0;
 const p = new FakePramaan(Object.fromEntries(actions.map(id=>[id,()=>{ reached++;return {}; }])));
 for (const id of ["auth.backend.provision","auth.backend.domains.set","db.postgres.provision","auth.user.delete","auth.user.update","apps.connection.start"]) {
  await expect(p.call(id,{})).rejects.toMatchObject({code:"invalid_request",status:400,message:ACTION_KEY_REQUIRED});
 }
 expect(reached).toBe(0);
});
test("the real client sends managed action request identities as HTTP headers", async () => {
 const seen: {id:string;key:string|null}[] = [];
 const p = createPramaan({apiKey:"offline-test",fetch:async (url,init)=>{
  seen.push({id:decodeURIComponent(new URL(String(url)).pathname.split("/").pop()!),key:new Headers(init?.headers).get("Idempotency-Key")});
  return demoFetch(String(url),init!);
 }});
 await p.authBackendProvision({idempotencyKey:"managed-signin-fixture"});
 await p.authBackendDomainsSet({domains:["https://app.example.test"]},{idempotencyKey:"managed-domain-fixture"});
 await expect(p.dbPostgresProvision({idempotencyKey:"managed-database-fixture"})).rejects.toBeInstanceOf(PramaanError);
 await p.authUserDelete("owned-person",{idempotencyKey:"managed-delete-fixture"});
 expect(seen).toEqual([{id:"auth.backend.provision",key:"managed-signin-fixture"},{id:"auth.backend.domains.set",key:"managed-domain-fixture"},{id:"db.postgres.provision",key:"managed-database-fixture"},{id:"auth.user.delete",key:"managed-delete-fixture"}]);
 await expect(p.authBackendProvision()).rejects.toMatchObject({code:"invalid_request",status:400});expect(seen).toHaveLength(4);
});
