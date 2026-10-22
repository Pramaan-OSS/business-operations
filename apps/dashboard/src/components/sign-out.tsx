"use client";

import { createClient } from "@business-operations/supabase/client";
import { Button } from "@business-operations/ui/button";
import { DropdownMenuItem } from "@business-operations/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignOut({ standalone = false }: { standalone?: boolean }) {
  const [isLoading, setLoading] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  const handleSignOut = async () => {
    setLoading(true);

    await supabase.auth.signOut({
      scope: "local",
    });

    router.push("/login");
  };

  if (standalone) return <Button variant="outline" disabled={isLoading} onClick={handleSignOut}>{isLoading ? "Loading..." : "Sign out"}</Button>;

  return (
    <DropdownMenuItem
      className="text-xs"
      data-track="User Signed Out"
      onClick={handleSignOut}
    >
      {isLoading ? "Loading..." : "Sign out"}
    </DropdownMenuItem>
  );
}
