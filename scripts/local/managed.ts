import { mkdir, chmod, writeFile, rename } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { requirePramaan, type Pramaan } from "../../packages/pramaan/src/index";
import { ManagedRuntime } from "../../packages/pramaan/src/managed-runtime";

/** Generated private Compose settings keep all services on the selected connection. */
export async function configureManagedServices(values: Record<string, string>, directory = ".runtime", client?: Pramaan) {
  await mkdir(directory, { recursive: true, mode: 0o700 }); await chmod(directory, 0o700);
  const appUrl = new URL(values.APP_URL || values.NEXT_PUBLIC_URL || "http://localhost:3001").origin;
  const local = `postgresql://postgres:${encodeURIComponent(values.LOCAL_DATABASE_PASSWORD!)}@database:5432/business_operations`;
  let database: { mode: "managed" | "local"; connectionString: string; directConnectionString: string; startupMessage?: string } = { mode: "local", connectionString: local, directConnectionString: local };
  let signIn: { mode: "managed" | "local"; authUrl?: string; jwksUrl?: string; startupMessage?: string } = { mode: "local" };
  if (values.PRAMAAN_API_KEY?.trim()) {
    for (const [key, value] of Object.entries(values)) process.env[key] = value;
    const runtime = new ManagedRuntime(client ?? requirePramaan(), directory, values.PRAMAAN_API_KEY);
    database = await runtime.database(local);
    if (database.startupMessage) console.log(database.startupMessage);
    signIn = await runtime.signIn(appUrl);
    if (signIn.startupMessage) console.log(signIn.startupMessage);
  }
  const authDatabase = new URL(database.directConnectionString);
  authDatabase.searchParams.set("search_path", "auth");
  const config = { services: {
    auth: { environment: { GOTRUE_DB_DATABASE_URL: authDatabase.href, GOTRUE_SITE_URL: appUrl, GOTRUE_URI_ALLOW_LIST: `${appUrl}/**` } },
    rest: { environment: { PGRST_DB_URI: database.connectionString } },
    app: { build: { args: { NEXT_PUBLIC_URL: appUrl } }, environment: {
      APP_URL: appUrl, NEXT_PUBLIC_URL: appUrl, BUSINESS_OPERATIONS_DASHBOARD_URL: appUrl,
      ALLOWED_API_ORIGINS: appUrl,
      DATABASE_PRIMARY_URL: database.connectionString, DATABASE_PRIMARY_POOLER_URL: database.connectionString,
      DATABASE_DIRECT_URL: database.directConnectionString, DATABASE_SSL: database.mode === "managed" ? "true" : "false",
      APP_SIGN_IN_MODE: signIn.mode, MANAGED_AUTH_URL: signIn.authUrl || "", MANAGED_AUTH_JWKS_URL: signIn.jwksUrl || "",
    } },
  } };
  const temp = `${directory}/services-${randomUUID()}.pending`;
  await writeFile(temp, JSON.stringify(config), { flag: "wx", mode: 0o600 });
  await rename(temp, `${directory}/services.compose.json`);
}
