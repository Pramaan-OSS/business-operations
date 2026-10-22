import { signInReturnPath } from "@/utils/sign-in-return";
import { getCountryCode, getCurrency } from "@business-operations/location";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OnboardingPage } from "@/components/onboarding/onboarding-page";
import { getQueryClient, HydrateClient, trpc } from "@/trpc/server";

export const metadata: Metadata = {
  title: "Onboarding | Business Operations",
};

export default async function Page({ searchParams }: { searchParams: Promise<{ create?: string; return_to?: string }> }) {
  const values = await searchParams;
  const createAdditional = values.create === "true";
  const returnTo = signInReturnPath(values.return_to);
  const queryClient = getQueryClient();

  const user = await queryClient
    .fetchQuery(trpc.user.me.queryOptions())
    .catch(() => redirect("/login"));

  if (!user) {
    redirect("/login");
  }

  const teams = await queryClient.fetchQuery(trpc.team.list.queryOptions());
  const hasOtherTeams = (teams?.length ?? 0) > 1;

  const currency = getCurrency();
  const countryCode = getCountryCode();

  return (
    <HydrateClient>
      <OnboardingPage
        defaultCurrencyPromise={currency}
        defaultCountryCodePromise={countryCode}
        hasOtherTeams={hasOtherTeams}
        createAdditional={createAdditional}
        returnTo={returnTo}
        user={{
          id: user.id,
          fullName: user.fullName,
          avatarUrl: user.avatarUrl ?? null,
          teamId: user.teamId,
        }}
      />
    </HydrateClient>
  );
}
