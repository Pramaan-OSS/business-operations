"use client";
import { useState } from "react";
import { Button } from "@business-operations/ui/button";
export function McpSetupInstructions() {
  const [copied, setCopied] = useState(false);
  const url = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002"}/mcp`;
  return <div className="space-y-4"><p>Connect an assistant that supports MCP, the protocol for letting another app read or act on this workspace.</p><ol className="list-decimal pl-6 space-y-2"><li>Add a server in your assistant's connection settings.</li><li>Choose HTTP and enter this installation's server address.</li><li>Sign in and grant only the permissions you need.</li><li>Review sends and financial actions in Business Operations before approving them.</li></ol><code className="block break-all border p-3">{url}</code><Button variant="outline" onClick={async () => { await navigator.clipboard.writeText(url); setCopied(true); }}>{copied ? "Copied" : "Copy server address"}</Button></div>;
}
