import { getCredentials } from "../config/store.js";
import { isTTY } from "../utils/env.js";

const BUSINESS_OPERATIONS_ASCII = [
  "  ███╗   ███╗██╗██████╗ ██████╗  █████╗ ██╗   ██╗",
  "  ████╗ ████║██║██╔══██╗██╔══██╗██╔══██╗╚██╗ ██╔╝",
  "  ██╔████╔██║██║██║  ██║██║  ██║███████║ ╚████╔╝ ",
  "  ██║╚██╔╝██║██║██║  ██║██║  ██║██╔══██║  ╚██╔╝  ",
  "  ██║ ╚═╝ ██║██║██████╔╝██████╔╝██║  ██║   ██║   ",
  "  ╚═╝     ╚═╝╚═╝╚═════╝ ╚═════╝ ╚═╝  ╚═╝   ╚═╝   ",
].join("\n");

export function getBrandingText(version: string): string {
  if (!isTTY()) return "";

  const creds = getCredentials();
  const lines: string[] = [];

  lines.push("");
  lines.push(BUSINESS_OPERATIONS_ASCII);
  lines.push("");

  const parts: string[] = [`v${version}`];

  if (creds?.email) {
    parts.push(creds.email);
  }
  if (creds?.teamName) {
    parts.push(creds.teamName);
  }
  if (!creds?.email && !creds?.teamName) {
    parts.push("not logged in");
  }

  lines.push(`  ${parts.join("  ·  ")}`);
  lines.push("");

  return lines.join("\n");
}
