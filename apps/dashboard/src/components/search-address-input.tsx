"use client";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@business-operations/ui/button";
import { useTRPC } from "@/trpc/client";
export type AddressDetails = { address_line_1: string; city: string; state: string; zip: string; country: string; country_code: string };
export function SearchAddressInput({ onSelect, countryCode, defaultValue = "", placeholder = "Search for an address", disabled = false, id, emptyMessage = "No results found. Enter the address manually." }: {
  id?: string; countryCode?: string; defaultValue?: string; placeholder?: string; disabled?: boolean; emptyMessage?: string; onSelect: (value: AddressDetails) => void;
}) {
  const trpc = useTRPC();
  const [text, setText] = useState(defaultValue);
  const [message, setMessage] = useState("");
  const suggestions = useMutation(trpc.customers.addressSuggestions.mutationOptions());
  const details = useMutation(trpc.customers.addressDetails.mutationOptions());
  return <div className="space-y-2"><div className="flex gap-2"><input id={id} aria-label="Address beginning" className="border bg-background p-2 min-w-0 flex-1" value={text} maxLength={32} placeholder={placeholder} disabled={disabled} onChange={event => { setText(event.target.value); suggestions.reset(); details.reset(); setMessage(""); }} /><Button type="button" variant="outline" disabled={disabled || !countryCode || !text || suggestions.isPending} onClick={() => suggestions.mutate({ countryCode: countryCode!, text })}>Find address</Button></div>{!countryCode && <p className="text-sm text-muted-foreground">Choose a country below before searching.</p>}{suggestions.data?.results.map((row, index) => <Button key={index} type="button" variant="ghost" className="block text-left h-auto whitespace-normal" disabled={details.isPending} onClick={() => details.mutate({ query: row.text, countryCode: countryCode! })}>{row.text}</Button>)}{suggestions.isSuccess && !suggestions.data.results.length && <p>{emptyMessage}</p>}{details.data?.results.map((row, index) => <Button key={index} type="button" variant="outline" className="block text-left h-auto whitespace-normal" onClick={() => {
    const component = (type: string) => row.components?.find(value => value.types.includes(type));
    const street = [component("street_number")?.longText, component("route")?.longText].filter(Boolean).join(" ");
    const country = component("country");
    if (!street || !country?.shortText) { setMessage("Address details are incomplete. Enter the address manually."); return; }
    onSelect({ address_line_1: street, city: component("postal_town")?.longText || component("locality")?.longText || "", state: component("administrative_area_level_1")?.shortText || "", zip: component("postal_code")?.longText || "", country: country.longText, country_code: country.shortText });
    suggestions.reset(); details.reset(); setText(street.slice(0, 32));
  }}>{row.formattedAddress}</Button>)}{[suggestions.error, details.error].filter(Boolean).map((error, index) => <p role="alert" key={index}>{error?.message}</p>)}{message && <p role="alert">{message}</p>}</div>;
}
