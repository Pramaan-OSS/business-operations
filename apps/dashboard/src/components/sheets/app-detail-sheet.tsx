"use client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@business-operations/ui/sheet";
import { parseAsString, useQueryState } from "nuqs";
import { McpSetupInstructions } from "@/components/mcp-setup-instructions";
export function AppDetailSheet() {
  const [app, setApp] = useQueryState("mcp-app", parseAsString);
  return <Sheet open={!!app} onOpenChange={open => { if (!open) void setApp(null); }}><SheetContent><SheetHeader><SheetTitle>Connect an assistant</SheetTitle></SheetHeader><McpSetupInstructions /></SheetContent></Sheet>;
}
