import { expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { PramaanError } from "@business-operations/pramaan";
import { FakePramaan } from "@business-operations/pramaan/fake";
import { putObject } from "@business-operations/storage";
import { mkdir, mkdtemp } from "node:fs/promises";
import path from "node:path";
import { startInvoicePayment, invoicePaymentStatus, invoiceEmailPaymentUrl } from "./payments";
const checkoutRef = `ref_${"1".repeat(26)}`, capturedRef = `rh_${"2".repeat(24)}`, linkRef = `ref_${"3".repeat(26)}`;
const invoice = { id: "invoice1", amount: 12.5, currency: "GBP", invoiceNumber: "INV1" };
const returnUrl = "https://example.test/invoice";
async function isolated(run: () => Promise<void>) {
 const scratch=path.resolve(__dirname,"../../../.scratch");await mkdir(scratch,{recursive:true});
 const previous=process.env.STORAGE_ROOT,category=process.env.INVOICE_PAYMENT_TAX_CATEGORY;process.env.STORAGE_ROOT=await mkdtemp(`${scratch}/payments-`);process.env.INVOICE_PAYMENT_TAX_CATEGORY="saas";
 try {await run();} finally {if(previous===undefined)delete process.env.STORAGE_ROOT;else process.env.STORAGE_ROOT=previous;if(category===undefined)delete process.env.INVOICE_PAYMENT_TAX_CATEGORY;else process.env.INVOICE_PAYMENT_TAX_CATEGORY=category;}
}
const checkout = () => ({ref:checkoutRef,checkoutUrl:"https://example.test/checkout"});
const link = () => ({ref:linkRef,paymentLinkId:"link_fixture",status:"created" as const,amount:{amount:1250,currency:"GBP"},paymentUrl:"https://example.test/pay"});
const unavailable = () => {throw new PramaanError("upstream_unavailable","Unavailable",{status:502});};
test("both entry paths require approval and reuse one link with notifications disabled",()=>isolated(async()=>{
 const fake=new FakePramaan({"payments.payment-link.create":link});
 await expect(startInvoicePayment(invoice,false,"link",returnUrl,fake)).rejects.toThrow("Confirm");expect(fake.calls).toHaveLength(0);
 expect((await startInvoicePayment(invoice,true,"link",returnUrl,fake)).url).toBe("https://example.test/pay");
 await startInvoicePayment(invoice,true,"checkout",returnUrl,fake);
 expect(fake.callsTo("payments.payment-link.create")).toEqual([{amount:1250,currency:"GBP",description:"Invoice INV1",reference:"invoice1",allowPartial:false,notifyEmail:false,notifySms:false,reminders:false,taxCategory:"saas"}]);
 expect(fake.calls[0]?.opts?.idempotencyKey).toMatch(/^invoice-link:invoice1:/);expect(fake.callsTo("payments.checkout.create")).toHaveLength(0);
}));
test("link state requires the exact requested and captured amount and currency",()=>isolated(async()=>{
 const paid={...link(),status:"paid",amountPaid:{amount:1250,currency:"GBP"},payments:[{ref:capturedRef,amount:{amount:1250,currency:"GBP"}}]};
 const fake=new FakePramaan({"payments.payment-link.create":link,"payments.payment-link.get":()=>paid});
 await startInvoicePayment(invoice,true,"link",returnUrl,fake);
 expect((await invoicePaymentStatus(invoice,fake)).paid).toBe(true);
 for(const change of [{status:"created"},{amountPaid:{amount:1000,currency:"GBP"}},{amount:{amount:1250,currency:"USD"}},{amountPaid:{amount:1251,currency:"GBP"}},{payments:[]},{amountPaid:undefined},{payments:[{ref:capturedRef,amount:{amount:1250,currency:"USD"}}]},{payments:[{ref:capturedRef,amount:{amount:1250,currency:"GBP"}},{ref:`rh_${"3".repeat(24)}`,amount:{amount:1,currency:"USD"}}]},{payments:[{ref:capturedRef,amount:{amount:625,currency:"GBP"}},{ref:capturedRef,amount:{amount:625,currency:"GBP"}}]}]){
  fake.route({"payments.payment-link.get":()=>({...paid,...change})});expect((await invoicePaymentStatus(invoice,fake)).paid).toBe(false);
 }
 expect(fake.callsTo("payments.payment-link.get")[0]).toEqual({ref:linkRef});expect(fake.callsTo("payments.checkout.get")).toHaveLength(0);
}));
for(const code of ["upstream_unavailable","connection_required"] as const)test(`${code} alone selects and reuses checkout fallback`,()=>isolated(async()=>{
 const fake=new FakePramaan({"payments.payment-link.create":()=>{throw new PramaanError(code,"Unavailable",{status:code === "connection_required" ? 409 : 502});},"payments.checkout.create":checkout,"payments.checkout.get":()=>({status:"paid",payments:[{ref:capturedRef,status:"captured",amount:{amount:1250,currency:"GBP"}}]})});
 expect((await startInvoicePayment(invoice,true,"link",returnUrl,fake)).url).toBe("https://example.test/checkout");
 await startInvoicePayment(invoice,true,"link",returnUrl,fake);expect(fake.callsTo("payments.payment-link.create")).toHaveLength(1);
 expect(fake.callsTo("payments.checkout.create")).toEqual([{lineItems:[{name:"Invoice INV1",amount:1250,currency:"gbp",quantity:1}],successUrl:returnUrl,cancelUrl:returnUrl,mode:"payment"}]);
 expect(fake.calls[1]?.opts?.idempotencyKey).toMatch(/^invoice-checkout:invoice1:/);expect((await invoicePaymentStatus(invoice,fake)).paid).toBe(true);expect(fake.callsTo("payments.checkout.get")).toEqual([{ref:checkoutRef}]);expect(fake.callsTo("payments.payment-link.get")).toHaveLength(0);
}));
test("fallback confirmation rejects authorised, partial and wrong-currency payments",()=>isolated(async()=>{
 const fake=new FakePramaan({"payments.payment-link.create":unavailable,"payments.checkout.create":checkout,"payments.checkout.get":()=>({status:"completed",payments:[{ref:capturedRef,status:"authorised",amount:{amount:1250,currency:"GBP"}}]})});
 await startInvoicePayment(invoice,true,"link",returnUrl,fake);expect((await invoicePaymentStatus(invoice,fake)).paid).toBe(false);
 for(const [amount,currency] of [[1000,"GBP"],[1250,"USD"],[1251,"GBP"]] as const){fake.route({"payments.checkout.get":()=>({status:"paid",payments:[{ref:capturedRef,status:"captured",amount:{amount,currency}}]})});expect((await invoicePaymentStatus(invoice,fake)).paid).toBe(false);}
}));
for(const code of ["rate_limited","upstream_timeout","conflict","invalid_request","unauthorized"] as const)test(`${code} never starts a second collection request`,()=>isolated(async()=>{
 const fake=new FakePramaan({"payments.payment-link.create":()=>{throw new PramaanError(code,"Private refusal");}});
 await expect(startInvoicePayment(invoice,true,"link",returnUrl,fake)).rejects.toThrow("Check its status");await expect(startInvoicePayment(invoice,true,"link",returnUrl,fake)).rejects.toThrow("Check its status");expect(fake.calls).toHaveLength(1);
}));
test("an uncertain checkout fallback cannot replay and preserves zero-decimal amounts",()=>isolated(async()=>{
 const fake=new FakePramaan({"payments.payment-link.create":unavailable,"payments.checkout.create":()=>{throw new Error("Connection lost after sending.");}});
 const next={...invoice,id:"invoice3",amount:10,currency:"JPY"};
 await expect(startInvoicePayment(next,true,"link",returnUrl,fake)).rejects.toThrow("Check its status");await expect(startInvoicePayment(next,true,"link",returnUrl,fake)).rejects.toThrow("Check its status");
 expect(fake.callsTo("payments.payment-link.create")).toHaveLength(1);expect(fake.callsTo("payments.checkout.create")).toHaveLength(1);expect(fake.callsTo("payments.checkout.create")[0]).toMatchObject({lineItems:[{amount:10,currency:"jpy"}]});
}));
test("legacy links require review and saved checkouts are reused without a new link",()=>isolated(async()=>{
 const hash=createHash("sha256").update("1250:GBP").digest("hex");const key=`invoice1/${hash}.json`;
 await putObject({bucket:"invoice-payments",path:key,data:JSON.stringify({state:"ready",kind:"link",paymentLinkId:"legacy",url:"https://example.test/old"})});const fake=new FakePramaan();
 await expect(startInvoicePayment(invoice,true,"link",returnUrl,fake)).rejects.toThrow("needs review");expect(await invoicePaymentStatus(invoice,fake)).toEqual({paid:false,status:"review_required"});expect(fake.calls).toHaveLength(0);
 await putObject({bucket:"invoice-payments",path:key,data:JSON.stringify({state:"ready",kind:"checkout",ref:checkoutRef,url:"https://example.test/checkout"})});expect((await startInvoicePayment(invoice,true,"link",returnUrl,fake)).url).toBe("https://example.test/checkout");expect(fake.calls).toHaveLength(0);
}));
test("expired signed links refresh through get without creating another payment request",()=>isolated(async()=>{
 const fake=new FakePramaan({"payments.payment-link.create":()=>({...link(),linkExpiresAt:"2000-01-01T00:00:00Z"}),"payments.payment-link.get":()=>({...link(),paymentUrl:"https://example.test/refreshed",linkExpiresAt:"2099-01-01T00:00:00Z"})});
 await startInvoicePayment(invoice,true,"link",returnUrl,fake);expect((await startInvoicePayment(invoice,true,"link",returnUrl,fake)).url).toBe("https://example.test/refreshed");expect(fake.callsTo("payments.payment-link.create")).toHaveLength(1);expect(fake.callsTo("payments.payment-link.get")).toHaveLength(1);expect(fake.callsTo("payments.checkout.create")).toHaveLength(0);
}));
test("a link read refusal cannot create a checkout or another link",()=>isolated(async()=>{
 const fake=new FakePramaan({"payments.payment-link.create":link,"payments.payment-link.get":unavailable});await startInvoicePayment(invoice,true,"link",returnUrl,fake);await expect(invoicePaymentStatus(invoice,fake)).rejects.toThrow();expect(fake.callsTo("payments.checkout.create")).toHaveLength(0);expect(fake.callsTo("payments.payment-link.create")).toHaveLength(1);
}));
test("malformed link results cannot trigger a second payment request",()=>isolated(async()=>{
 const fake=new FakePramaan({"payments.payment-link.create":()=>({...link(),paymentUrl:"http://example.test/unsafe"})});await expect(startInvoicePayment(invoice,true,"link",returnUrl,fake)).rejects.toThrow("Check its status");await expect(startInvoicePayment(invoice,true,"link",returnUrl,fake)).rejects.toThrow("Check its status");expect(fake.calls).toHaveLength(1);
}));
test("invoice delivery creates links only after approval and skips paid invoices",()=>isolated(async()=>{
 const fake=new FakePramaan({"payments.payment-link.create":link});expect(await invoiceEmailPaymentUrl({...invoice,template:{paymentEnabled:false}},true,returnUrl,fake)).toBeUndefined();await expect(invoiceEmailPaymentUrl({...invoice,template:{paymentEnabled:true}},false,returnUrl,fake)).rejects.toThrow("Confirm");expect(fake.calls).toHaveLength(0);expect(await invoiceEmailPaymentUrl({...invoice,template:{paymentEnabled:true}},true,returnUrl,fake)).toBe("https://example.test/pay");expect(await invoiceEmailPaymentUrl({...invoice,status:"paid",template:{paymentEnabled:true}},true,returnUrl,fake)).toBeUndefined();expect(fake.calls).toHaveLength(1);
}));

test("a lost link response never selects checkout fallback",()=>isolated(async()=>{
 const fake=new FakePramaan({"payments.payment-link.create":()=>{throw new PramaanError("upstream_unavailable","Connection lost",{retryable:true});}});await expect(startInvoicePayment(invoice,true,"link",returnUrl,fake)).rejects.toThrow("Check its status");await expect(startInvoicePayment(invoice,true,"link",returnUrl,fake)).rejects.toThrow("Check its status");expect(fake.calls).toHaveLength(1);
}));
test("expired saved checkout requests cannot be replaced automatically",()=>isolated(async()=>{
 const fake=new FakePramaan({"payments.payment-link.create":unavailable,"payments.checkout.create":()=>({...checkout(),expiresAt:"2000-01-01T00:00:00Z"})});await startInvoicePayment(invoice,true,"link",returnUrl,fake);await expect(startInvoicePayment(invoice,true,"link",returnUrl,fake)).rejects.toThrow("expired");expect(fake.callsTo("payments.checkout.create")).toHaveLength(1);
}));
test("tax category is never inferred and invalid configuration sends no requests",()=>isolated(async()=>{
 delete process.env.INVOICE_PAYMENT_TAX_CATEGORY;const fake=new FakePramaan({"payments.payment-link.create":unavailable,"payments.checkout.create":checkout});await startInvoicePayment(invoice,true,"link",returnUrl,fake);expect(fake.callsTo("payments.payment-link.create")[0]).not.toHaveProperty("taxCategory");process.env.INVOICE_PAYMENT_TAX_CATEGORY="other";await expect(startInvoicePayment({...invoice,id:"new-invoice"},true,"link",returnUrl,fake)).rejects.toThrow("tax category");expect(fake.calls).toHaveLength(2);
}));
