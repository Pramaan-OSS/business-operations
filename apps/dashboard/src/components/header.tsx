import { Skeleton } from "@business-operations/ui/skeleton";
import { Suspense } from "react";
import { ConnectionStatus } from "@/components/connection-status";
import { NotificationCenter } from "@/components/notification-center";
import { OpenSearchButton } from "@/components/search/open-search-button";
import { UserMenu } from "@/components/user-menu";
import { MobileMenu } from "./mobile-menu";

function UserMenuSkeleton() {
  return <Skeleton className="w-8 h-8 rounded-full" />;
}

export function Header() {
  return (
    <header
      className="bo-header z-40 flex justify-between items-center"
      style={{
        transform: "translateY(calc(var(--header-offset, 0px) * -1))",
        transitionDuration: "var(--header-transition, 200ms)",
        willChange: "transform",
      }}
    >
      <MobileMenu />

      <span className="bo-wordmark hidden lg:block mr-5">Business Operations</span>
      <OpenSearchButton />

      <div className="flex space-x-2 ml-auto">
        <ConnectionStatus />
        <NotificationCenter />
        <Suspense fallback={<UserMenuSkeleton />}>
          <UserMenu />
        </Suspense>
      </div>
    </header>
  );
}
