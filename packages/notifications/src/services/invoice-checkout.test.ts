import { expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { mkdtemp } from "node:fs/promises";
import path from "node:path";
import type { Database } from "@business-operations/db/client";
import { invoiceEmailPaymentUrl } from "@business-operations/invoice/payments";
import { PramaanError } from "@business-operations/pramaan";
import { FakePramaan } from "@business-operations/pramaan/fake";
import { sendEmail } from "@business-operations/utils/send-email";
import { invoiceSent } from "../types/invoice-sent";
import { invoiceReminderSent } from "../types/invoice-reminder-sent";
import { EmailService } from "./email-service";

for (const fallback of [false, true]) test(`invoice and reminder emails use app email with ${fallback ? "checkout fallback" : "payment links"}`, async()=>{
 const previous={storage:process.env.STORAGE_ROOT,from:process.env.EMAIL_FROM,cipher:process.env.CIPHER_SECRET_KEY,category:process.env.INVOICE_PAYMENT_TAX_CATEGORY};
 process.env.STORAGE_ROOT=await mkdtemp(path.resolve(__dirname,"../../../../.scratch/checkout-email-"));
 process.env.INVOICE_PAYMENT_TAX_CATEGORY="saas";
 delete process.env.EMAIL_FROM;process.env.CIPHER_SECRET_KEY="1".repeat(64);
 const checkoutUrl="https://checkout.example.test/pay";
 const fake=new FakePramaan({"payments.payment-link.create":()=>{if(fallback)throw new PramaanError("connection_required","Unavailable",{status:409});return {ref:`ref_${"4".repeat(26)}`,paymentLinkId:"link_fixture",status:"created",amount:{amount:1250,currency:"GBP"},paymentUrl:checkoutUrl};},"payments.checkout.create":()=>({ref:`ref_${"1".repeat(26)}`,checkoutUrl}),"email.send":()=>({ref:`ref_${"3".repeat(26)}`,status:"sent"})});
 try {
  const invoice={id:randomUUID(),amount:12.5,currency:"GBP",invoiceNumber:"INV1",template:{paymentEnabled:true}};
  const paymentUrl=await invoiceEmailPaymentUrl(invoice,true,"https://app.example.test/i/token",fake);
  expect(await invoiceEmailPaymentUrl(invoice,true,"https://app.example.test/i/token",fake)).toBe(paymentUrl);
  const user={id:randomUUID(),team_id:randomUUID(),email:"owner@example.test",full_name:"Fixture owner",locale:"en"};
  const team={id:user.team_id,name:"Fixture business",inboxId:"fixture"};
  const data={users:[],invoiceId:invoice.id,token:"fixture-token",invoiceNumber:"INV1",customerName:"Fixture customer",customerEmail:"customer@example.test",paymentUrl,amount:12.5,currency:"GBP"};
  const service=new EmailService({} as Database,input=>sendEmail(input,fake));
  for(const [type,handler] of [["invoice_sent",invoiceSent],["invoice_reminder_sent",invoiceReminderSent]] as const){
   const parsed=handler.schema.parse(data);const email=handler.createEmail!(parsed,user,team);
   await service.sendBulk([{...email,user,idempotencyKey:`approved-${type}`}],type);
  }
  const emails=fake.callsTo("email.send") as {html:string;to:string[];from:string;replyTo:string}[];
  expect(emails).toHaveLength(2);
  for(const email of emails){expect(email.html).toContain(checkoutUrl);expect(email.html).toContain("Pay invoice");expect(email.html).toContain("/i/fixture-token");expect(email.to).toEqual(["customer@example.test"]);expect(email.from).toBe("Business Operations <noreply@updates.pramaan.one>");expect(email.replyTo).toBe("owner@example.test");}
  expect(fake.callsTo("payments.checkout.create")).toHaveLength(fallback ? 1 : 0);expect(fake.callsTo("payments.payment-link.create")).toHaveLength(1);
  expect(fake.calls.some(call=>/payments\.payment-link\.(notify|cancel|orders\.list)$/.test(call.id))).toBe(false);
  expect(invoiceSent.schema.safeParse({...data,paymentUrl:"http://example.test/unsafe"}).success).toBe(false);
 } finally {
  for(const [key,value] of [["STORAGE_ROOT",previous.storage],["EMAIL_FROM",previous.from],["CIPHER_SECRET_KEY",previous.cipher],["INVOICE_PAYMENT_TAX_CATEGORY",previous.category]] as const){if(value===undefined)delete process.env[key];else process.env[key]=value;}
 }
});
