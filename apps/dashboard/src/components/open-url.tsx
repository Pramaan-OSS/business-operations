"use client";

import { openUrl } from "@business-operations/desktop-client/core";
import { isDesktopApp } from "@business-operations/desktop-client/platform";
import { cn } from "@business-operations/ui/cn";

export function OpenURL({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  const handleOnClick = () => {
    if (isDesktopApp()) {
      openUrl(href);
    } else {
      window.open(href, "_blank");
    }
  };

  return (
    <span onClick={handleOnClick} className={cn("cursor-pointer", className)}>
      {children}
    </span>
  );
}
