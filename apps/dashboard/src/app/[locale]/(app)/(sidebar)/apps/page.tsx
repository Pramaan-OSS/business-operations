import type { Metadata } from "next";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";
import { Apps } from "@/components/apps";
import { AppsSkeleton } from "@/components/apps.skeleton";
import { AppsHeader } from "@/components/apps-header";
import { ErrorFallback } from "@/components/error-fallback";
import {
  batchPrefetch,
  getQueryClient,
  HydrateClient,
  trpc,
} from "@/trpc/server";

export const metadata: Metadata = {
  title: "Apps | Business Operations",
};

export default async function Page() {
  const _queryClient = getQueryClient();

  batchPrefetch([
    trpc.connectors.list.queryOptions(),
  ]);

  return (
    <HydrateClient>
      <div className="mt-4">
        <AppsHeader />

        <ErrorBoundary errorComponent={ErrorFallback}>
          <Suspense fallback={<AppsSkeleton />}>
            <Apps />
          </Suspense>
        </ErrorBoundary>
      </div>
    </HydrateClient>
  );
}
