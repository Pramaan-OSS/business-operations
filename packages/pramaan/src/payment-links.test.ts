import { expect, test } from "bun:test";
import { createPramaan } from "./index";
import { FakePramaan } from "./fake";
import { demoFetch } from "./demo-transport";
const ref = `ref_${"1".repeat(26)}`;
const input = {amount:1250,currency:"GBP",notifyEmail:false,notifySms:false,reminders:false,taxCategory:"saas" as const};
const result = {ref,paymentLinkId:"link_fixture",status:"created",amount:{amount:1250,currency:"GBP"},paymentUrl:"https://example.test/pay",linkExpiresAt:"2099-01-01T00:00:00Z"};
for(const transport of ["http","fake"] as const){
 test(`${transport} validates payment link requests and completed shapes`,async()=>{
  let calls=0;
  const readResult={...result,status:"paid",amountPaid:{amount:1250,currency:"GBP"},payments:[{ref:`rh_${"2".repeat(24)}`,amount:{amount:1250,currency:"GBP"}}]};
  const client=transport==="fake"?new FakePramaan({"payments.payment-link.create":()=>{calls++;return result;},"payments.payment-link.get":()=>readResult}):createPramaan({apiKey:"fixture",fetch:async(url)=>{calls++;return Response.json(String(url).includes("payments.payment-link.get")?readResult:result);}});
  expect((await client.paymentLinkCreate(input,{idempotencyKey:"fixture-link"})).paymentUrl).toBe(result.paymentUrl);
  expect((await client.paymentLinkGet({ref})).status).toBe("paid");
  const before=calls;await expect(client.paymentLinkGet({ref,paymentLinkId:"ambiguous"})).rejects.toThrow();expect(calls).toBe(before);
  await expect(client.paymentLinkCreate({...input,taxCategory:"invented" as any},{idempotencyKey:"invalid-category"})).rejects.toThrow();expect(calls).toBe(before);
 });
 test(`${transport} refuses malformed link results`,async()=>{
  for(const bad of [{...result,status:"succeeded"},{...result,amount:{amount:12.5,currency:"GBP"}},{...result,amountPaid:{amount:1250,currency:"gbp"}},{...result,paymentUrl:"https://user:secret@example.test/pay"},{...result,payments:[{ref:"raw",amount:{amount:1250,currency:"GBP"}}]}]){
   const client=transport==="fake"?new FakePramaan({"payments.payment-link.get":()=>bad}):createPramaan({apiKey:"fixture",fetch:async()=>Response.json(bad)});
   await expect(client.paymentLinkGet({ref})).rejects.toThrow();
  }
 });
}
test("offline transport creates and reads payment links without a network call",async()=>{
 const client=createPramaan({apiKey:"fixture",fetch:demoFetch as typeof fetch});const link=await client.paymentLinkCreate(input,{idempotencyKey:"offline-link"});expect(link.ref).toBeDefined();expect(link.paymentUrl).toStartWith("https:");expect((await client.paymentLinkGet({ref:link.ref})).amount).toEqual({amount:1250,currency:"GBP"});
});
