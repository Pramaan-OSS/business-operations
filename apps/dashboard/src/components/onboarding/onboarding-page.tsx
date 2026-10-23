"use client";
import { signInReturnPath } from "@/utils/sign-in-return";
import { use, useState } from "react";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { uniqueCurrencies } from "@business-operations/location/currencies";
import { Button } from "@business-operations/ui/button";
import { useTRPC } from "@/trpc/client";
import { CountrySelector } from "@/components/country-selector";
import { SelectCurrency } from "@/components/select-currency";
type Props = { defaultCurrencyPromise: Promise<string>; defaultCountryCodePromise: Promise<string>; hasOtherTeams: boolean; createAdditional?: boolean; returnTo?: string; user: { id: string; fullName: string | null; avatarUrl: string | null; teamId: string | null } };
export function OnboardingPage({ defaultCurrencyPromise, defaultCountryCodePromise, hasOtherTeams, createAdditional, returnTo, user }: Props) {
  const trpc = useTRPC();
  const defaultCountry = use(defaultCountryCodePromise);
  const defaultCurrency = use(defaultCurrencyPromise);
  const [name, setName] = useState(user.fullName || "");
  const [business, setBusiness] = useState("");
  const [country, setCountry] = useState(defaultCountry);
  const [currency, setCurrency] = useState(defaultCurrency);
  const [message, setMessage] = useState("");
  const update = useMutation(trpc.user.update.mutationOptions());
  const create = useMutation(trpc.team.create.mutationOptions());
  if (user.teamId && user.fullName && !createAdditional) return <main className="mx-auto max-w-xl p-6 space-y-4"><h1 className="text-2xl">Your workspace is ready</h1><Link href={signInReturnPath(returnTo)} className="underline">Open dashboard</Link></main>;
  return <main className="bo-card bo-entry mx-auto max-w-xl space-y-6"><h1 className="text-2xl">Set up Business Operations</h1><p>Create your local workspace. You can upload receipts and transactions straight away, and connect optional services from the dashboard.</p><form className="space-y-4" onSubmit={async event => { event.preventDefault(); setMessage(""); try { await update.mutateAsync({ fullName: name }); await create.mutateAsync({ name: business, baseCurrency: currency, countryCode: country, switchTeam: true }); window.location.href = signInReturnPath(returnTo); } catch { setMessage("The workspace could not be created. Check the details and try again."); } }}><label className="block">Your name<input required minLength={2} maxLength={100} className="block border bg-background p-2 w-full" value={name} onChange={event => setName(event.target.value)} /></label><label className="block">Business name<input required minLength={2} maxLength={200} className="block border bg-background p-2 w-full" value={business} onChange={event => setBusiness(event.target.value)} /></label><fieldset className="block"><legend>Country</legend><CountrySelector defaultValue={country} onSelect={code => setCountry(code)} /></fieldset><fieldset className="block"><legend>Base currency</legend><SelectCurrency currencies={uniqueCurrencies} value={currency} onChange={setCurrency} /></fieldset><Button data-thread disabled={!country || !currency || update.isPending || create.isPending}>Create workspace</Button>{message && <p role="alert">{message}</p>}</form>{hasOtherTeams && <Link href="/teams" className="underline">Choose an existing workspace</Link>}</main>;
}
