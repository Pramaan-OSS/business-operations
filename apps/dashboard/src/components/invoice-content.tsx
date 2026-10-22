"use client";

import { SheetContent } from "@business-operations/ui/sheet";
import { useFormContext } from "react-hook-form";
import { Form } from "@/components/invoice/form";
import { InvoiceSuccess } from "@/components/invoice-success";
import { useInvoiceParams } from "@/hooks/use-invoice-params";

export function InvoiceContent({ loading = false, failed = false }: { loading?: boolean; failed?: boolean }) {
  const { invoiceType } = useInvoiceParams();
  const { watch } = useFormContext();
  const templateSize = watch("template.size");

  const size = templateSize === "a4" ? 650 : 740;

  if (invoiceType === "success") {
    return (
      <SheetContent className="bg-white dark:bg-[#080808] transition-[max-width] duration-300 ease-in-out">
        <InvoiceSuccess />
      </SheetContent>
    );
  }

  return (
    <SheetContent
      style={{ maxWidth: size }}
      className="bg-white dark:bg-[#080808] transition-[max-width] duration-300 ease-in-out p-0"
    >
      {loading ? <p role="status" className="p-8">Loading invoice…</p> : failed ? <p role="alert" className="p-8">The invoice could not load. Close it and try again.</p> : <Form />}
    </SheetContent>
  );
}
