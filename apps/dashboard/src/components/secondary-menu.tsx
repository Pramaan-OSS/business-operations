"use client";

import { cn } from "@business-operations/ui/cn";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type Item = {
  path: string;
  label: string;
};

type Props = {
  items: Item[];
};

export function SecondaryMenu({ items }: Props) {
  const currentPathname = usePathname();
  const [pathname, setPathname] = useState<string | null>(null);
  useEffect(() => { setPathname(currentPathname); }, [currentPathname]);

  return (
    <nav className="py-4">
      <ul className="flex space-x-6 text-sm overflow-auto scrollbar-hide">
        {items.map((item) => (
          <Link
            key={item.path}
            href={item.path}
            prefetch={false}
            className={cn(
              "text-[#606060]",
              pathname === item.path &&
                "text-primary font-medium underline underline-offset-8",
            )}
          >
            <span>{item.label}</span>
          </Link>
        ))}
      </ul>
    </nav>
  );
}
