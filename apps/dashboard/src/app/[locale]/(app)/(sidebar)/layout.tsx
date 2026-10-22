import { redirect } from "next/navigation";
import { ExportStatus } from "@/components/export-status";
import { GlobalTimerProvider } from "@/components/global-timer-provider";
import { Header } from "@/components/header";
import { GlobalSheetsProvider } from "@/components/sheets/global-sheets-provider";
import { Sidebar } from "@/components/sidebar";
import { TimezoneDetector } from "@/components/timezone-detector";
import {
  batchPrefetch,
  getQueryClient,
  HydrateClient,
  trpc,
} from "@/trpc/server";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const queryClient = getQueryClient();

  // NOTE: These are used in the global sheets
  batchPrefetch([
    trpc.team.current.queryOptions(),
    trpc.invoice.defaultSettings.queryOptions(),
    trpc.search.global.queryOptions({ searchTerm: "" }),
  ]);

  // Fetch the user – .catch → redirect so a transient API failure
  // (timeout, 5xx, expired session, etc.) doesn't crash the entire
  // layout and blank the page.
  const user = await queryClient
    .fetchQuery(trpc.user.me.queryOptions())
    .catch(() => redirect("/login"));

  if (!user) {
    redirect("/login");
  }

  if (!user.teamId) {
    redirect("/teams");
  }

  if (!user.fullName) {
    redirect("/onboarding");
  }

  return (
    <HydrateClient>
      <div className="relative">
        <Sidebar />

        <div className="bo-workspace">
          <Header />
          <div className="bo-view">{children}</div>
        </div>

        <ExportStatus />
        <GlobalSheetsProvider />
        <GlobalTimerProvider />
        <TimezoneDetector />
      </div>
    </HydrateClient>
  );
}
