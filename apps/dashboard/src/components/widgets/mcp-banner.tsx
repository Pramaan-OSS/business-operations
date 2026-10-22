"use client";
import { Button } from "@business-operations/ui/button";
import { parseAsString, useQueryState } from "nuqs";
export function McpBanner() { const [, setApp] = useQueryState("mcp-app", parseAsString); return <div className="border p-4 space-y-2"><h2>Connect your assistant</h2><p className="text-sm text-muted-foreground">Use this workspace from an assistant you choose, with permissions you control.</p><Button variant="outline" onClick={() => void setApp("assistant")}>Connection instructions</Button></div>; }
