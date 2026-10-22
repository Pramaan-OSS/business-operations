"use client";
import { useState } from "react";
import { Button } from "@business-operations/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@business-operations/ui/dialog";

type PaymentModalProps = { open: boolean; onOpenChange: (open: boolean) => void; invoiceToken: string;
  amount: number; currency: string; invoiceNumber: string; onSuccess?: () => void; prefetch?: boolean; useOverlay?: boolean };

export function PaymentModal({ open, onOpenChange, invoiceToken, amount, currency, invoiceNumber, onSuccess }: PaymentModalProps) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const api = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3003";
  async function call(action: "checkout" | "status") {
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`${api}/invoice-payments/${action}`, { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: invoiceToken, approved: action === "checkout", expectedAmount: amount, expectedCurrency: currency, mode: "link" }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "This feature is not available yet.");
      if (action === "checkout") {
        const url = new URL(data.url);
        if (url.protocol !== "https:") throw new Error("The payment page could not be confirmed.");
        window.location.assign(url.toString());
      } else if (data.paid === true) {
        setMessage("Payment confirmed."); onSuccess?.();
      } else setMessage("Payment is not confirmed yet. Check again after completing payment.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not confirm the payment. Check before trying again."); }
    finally { setBusy(false); }
  }
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent>
    <DialogHeader><DialogTitle>Pay invoice {invoiceNumber}</DialogTitle>
      <DialogDescription>Review the amount, then continue to the secure payment page.</DialogDescription></DialogHeader>
    <p>{new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount)}</p>
    <p>Payment opens on a secure hosted payment page.</p>
    <Button disabled={busy} onClick={() => call("checkout")}>Confirm and continue to payment</Button>
    <Button variant="outline" disabled={busy} onClick={() => call("status")}>Check payment status</Button>
    {message && <p role="status">{message}</p>}
  </DialogContent></Dialog>;
}
