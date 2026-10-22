import { invoiceFractionDigits } from "@business-operations/invoice/display-precision";
import { calculateTotal } from "@business-operations/invoice/calculate";
import { useCallback, useEffect } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { useTemplateUpdate } from "@/hooks/use-template-update";
import { AnimatedNumber } from "../animated-number";
import { FormatAmount } from "../format-amount";
import { AmountInput } from "./amount-input";
import { LabelInput } from "./label-input";
import { TaxInput } from "./tax-input";
import { VATInput } from "./vat-input";

export function Summary() {
  const { control, setValue } = useFormContext();
  const { updateTemplate } = useTemplateUpdate();

  const includeDecimals = useWatch({
    control,
    name: "template.includeDecimals",
  });



  const currency = useWatch({
    control,
    name: "template.currency",
  });

  const locale = useWatch({
    control,
    name: "template.locale",
  });

  const includeTax = useWatch({
    control,
    name: "template.includeTax",
  });

  const taxRate = useWatch({
    control,
    name: "template.taxRate",
  });

  const vatRate = useWatch({
    control,
    name: "template.vatRate",
  });

  const includeVat = useWatch({
    control,
    name: "template.includeVat",
  });

  const includeDiscount = useWatch({
    control,
    name: "template.includeDiscount",
  });

  const includeLineItemTax = useWatch({
    control,
    name: "template.includeLineItemTax",
  });

  const lineItems = useWatch({
    control,
    name: "lineItems",
  });

  const discount = useWatch({
    control,
    name: "discount",
  });

  const {
    subTotal,
    total,
    vat: totalVAT,
    tax: totalTax,
  } = calculateTotal({
    lineItems,
    taxRate,
    vatRate,
    includeVat,
    includeTax,
    includeLineItemTax,
    discount: discount ?? 0,
  });

  const maximumFractionDigits = invoiceFractionDigits(currency, includeDecimals, [subTotal, total, totalVAT, totalTax, discount ?? 0]);
  const taxFractionDigits = invoiceFractionDigits(currency, true, []);

  const updateFormValues = useCallback(() => {
    setValue("amount", total, { shouldValidate: true });
    setValue("vat", totalVAT, { shouldValidate: true });
    setValue("tax", totalTax, { shouldValidate: true });
    setValue("subtotal", subTotal, { shouldValidate: true });
    setValue("discount", discount ?? 0, { shouldValidate: true });
  }, [total, totalVAT, totalTax, subTotal, discount]);

  useEffect(() => {
    updateFormValues();
  }, [updateFormValues]);

  useEffect(() => {
    if (!includeTax) {
      setValue("template.taxRate", 0, {
        shouldValidate: true,
        shouldDirty: true,
      });
    }
  }, [includeTax]);

  useEffect(() => {
    if (!includeVat) {
      setValue("template.vatRate", 0, {
        shouldValidate: true,
        shouldDirty: true,
      });
    }
  }, [includeVat]);

  useEffect(() => {
    if (!includeDiscount) {
      setValue("discount", 0, { shouldValidate: true, shouldDirty: true });
    }
  }, [includeDiscount]);

  return (
    <div className="w-[320px] flex flex-col">
      <div className="flex justify-between items-center py-1">
        <LabelInput
          className="flex-shrink-0 min-w-6"
          name="template.subtotalLabel"
          onSave={(value) => {
            updateTemplate({ subtotalLabel: value });
          }}
        />
        <span className="text-right text-[11px] text-[#878787]">
          <FormatAmount
            amount={subTotal}
            maximumFractionDigits={maximumFractionDigits}
            currency={currency}
            locale={locale}
          />
        </span>
      </div>

      {includeDiscount && (
        <div className="flex justify-between items-center py-1">
          <LabelInput
            name="template.discountLabel"
            onSave={(value) => {
              updateTemplate({ discountLabel: value });
            }}
          />

          <AmountInput
            placeholder="0"
            allowNegative={false}
            name="discount"
            className="text-right text-[11px] text-[#878787] border-none"
          />
        </div>
      )}

      {includeVat && (
        <div className="flex justify-between items-center py-1">
          <div className="flex items-center gap-1">
            <LabelInput
              className="flex-shrink-0 min-w-5"
              name="template.vatLabel"
              onSave={(value) => {
                updateTemplate({ vatLabel: value });
              }}
            />

            <VATInput />
          </div>

          <span className="text-right text-[11px] text-[#878787]">
            <FormatAmount
              amount={totalVAT}
              maximumFractionDigits={taxFractionDigits}
              currency={currency}
              locale={locale}
            />
          </span>
        </div>
      )}

      {includeTax && !includeLineItemTax && (
        <div className="flex justify-between items-center py-1">
          <div className="flex items-center gap-1">
            <LabelInput
              className="flex-shrink-0 min-w-5"
              name="template.taxLabel"
              onSave={(value) => {
                updateTemplate({ taxLabel: value });
              }}
            />

            <TaxInput />
          </div>

          <span className="text-right text-[11px] text-[#878787]">
            <FormatAmount
              amount={totalTax}
              maximumFractionDigits={taxFractionDigits}
              currency={currency}
              locale={locale}
            />
          </span>
        </div>
      )}

      {includeLineItemTax && totalTax > 0 && (
        <div className="flex justify-between items-center py-1">
          <LabelInput
            className="flex-shrink-0 min-w-5"
            name="template.taxLabel"
            onSave={(value) => {
              updateTemplate({ taxLabel: value });
            }}
          />

          <span className="text-right text-[11px] text-[#878787]">
            <FormatAmount
              amount={totalTax}
              maximumFractionDigits={taxFractionDigits}
              currency={currency}
              locale={locale}
            />
          </span>
        </div>
      )}

      <div className="flex justify-between items-center py-4 mt-2 border-t border-border">
        <LabelInput
          name="template.totalSummaryLabel"
          onSave={(value) => {
            updateTemplate({ totalSummaryLabel: value });
          }}
        />
        <span className="text-right font-medium text-[21px]">
          <AnimatedNumber
            value={total}
            currency={currency}
            maximumFractionDigits={
              includeTax || includeVat || includeLineItemTax
                ? taxFractionDigits
                : maximumFractionDigits
            }
          />
        </span>
      </div>
    </div>
  );
}
