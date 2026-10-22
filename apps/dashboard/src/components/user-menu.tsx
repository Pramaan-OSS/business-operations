"use client";
import { Avatar, AvatarFallback, AvatarImageNext } from "@business-operations/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@business-operations/ui/dropdown-menu";
import Link from "next/link";
import { parseAsString, useQueryState } from "nuqs";
import { useUserQuery } from "@/hooks/use-user";
import { SignOut } from "./sign-out";
import { ThemeSwitch } from "./theme-switch";
export function UserMenu({ onlySignOut = false }: { onlySignOut?: boolean } = {}) {
  const { data: user } = useUserQuery();
  const [, setApp] = useQueryState("mcp-app", parseAsString);
  if (onlySignOut) return <SignOut standalone />;
  return <DropdownMenu><DropdownMenuTrigger aria-label="Account menu"><Avatar><AvatarImageNext src={user?.avatarUrl || ""} alt="" /><AvatarFallback>{user?.fullName?.slice(0, 1) || "B"}</AvatarFallback></Avatar></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuLabel>{user?.fullName || "Your account"}</DropdownMenuLabel><DropdownMenuItem asChild><Link href="/account">Account</Link></DropdownMenuItem><DropdownMenuItem asChild><Link href="/account/security">Security</Link></DropdownMenuItem><DropdownMenuItem asChild><Link href="/teams">Workspaces</Link></DropdownMenuItem><DropdownMenuItem onClick={() => void setApp("assistant")}>Connect an assistant</DropdownMenuItem><DropdownMenuSeparator /><ThemeSwitch /><SignOut /></DropdownMenuContent></DropdownMenu>;
}
