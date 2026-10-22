import { ManagedStartupError } from "../../packages/pramaan/src/managed-runtime";
import { createHmac, randomBytes } from "node:crypto";
const file = Bun.file(".env");
let text = await file.exists() ? await file.text() : "PRAMAAN_API_KEY=\n";
const values: Record<string, string> = {};
for (const line of text.split("\n")) { const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/); if (match) values[match[1]!] = match[2]!.trim().replace(/^['"]|['"]$/g, ""); }
function set(name: string, value: string) {
  if (values[name]) return;
  const pattern = new RegExp(`^${name}=.*$`, "m");
  text = pattern.test(text) ? text.replace(pattern, `${name}=${value}`) : `${text.trimEnd()}\n${name}=${value}\n`;
  values[name] = value;
}
for (const name of ["LOCAL_DATABASE_PASSWORD", "SUPABASE_JWT_SECRET", "INTERNAL_API_KEY", "FILE_KEY_SECRET", "INVOICE_JWT_SECRET", "BUSINESS_OPERATIONS_ENCRYPTION_KEY", "WEBHOOK_SECRET_KEY"]) set(name, randomBytes(32).toString("hex"));
function jwt(role: string) {
  const head = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify({ role, iss: "local", iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 10 * 365 * 86400 })).toString("base64url");
  return `${head}.${body}.${createHmac("sha256", values.SUPABASE_JWT_SECRET!).update(`${head}.${body}`).digest("base64url")}`;
}
set("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", jwt("anon"));
set("SUPABASE_SECRET_KEY", jwt("service_role"));
set("NEXT_PUBLIC_URL", "http://localhost:3001");
set("NEXT_PUBLIC_API_URL", "http://localhost:3002");
set("NEXT_PUBLIC_SUPABASE_URL", "http://localhost:65431");
await Bun.write(".env", text);
await import("node:fs/promises").then(fs => fs.chmod(".env", 0o600));
console.log("Local settings are ready.");

try {
  const { configureManagedServices } = await import("./managed");
  await configureManagedServices(values);
} catch (error) {
  console.error(error instanceof ManagedStartupError ? error.message : "Managed services could not be prepared. Check the private runtime settings before restarting.");
  process.exit(1);
}
