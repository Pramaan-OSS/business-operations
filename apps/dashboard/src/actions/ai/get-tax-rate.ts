"use server";
import { requirePramaan } from "@business-operations/pramaan";
import { getCountry, getCountryCode } from "@business-operations/location";
import { z } from "zod";
import { authActionClient } from "../safe-action";

export const getTaxRateAction = authActionClient.schema(z.object({ name: z.string().min(2) }))
  .metadata({ name: "get-tax-rate" }).action(async () => {
    const countryCode = await getCountryCode();
    const country = await getCountry();
    const result = await requirePramaan().financeVatRatesGet({ countryCode }) as { standardRate?: number };
    if (typeof result.standardRate !== "number" || !Number.isFinite(result.standardRate)) throw new Error("Tax rates are not available yet.");
    return { taxRate: result.standardRate, country: country?.name };
  });
