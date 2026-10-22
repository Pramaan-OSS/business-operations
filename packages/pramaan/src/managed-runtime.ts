import { createHash, randomUUID } from "node:crypto";
import { chmod, mkdir, readFile, rename, writeFile, lstat, open, unlink } from "node:fs/promises";
import path from "node:path";
import { PramaanError, type Pramaan } from "./index";
import { managedBackend, privateDatabaseAddress, type ManagedBackend } from "./managed-contracts";

type State = { backend?: ManagedBackend; domain?: string; database?: { connectionString: string; directConnectionString: string }; databaseRequest?: string; databaseKey?: string; backendRequest?: string; domainRequest?: { origin: string; key: string } };
export const LOCAL_DOMAIN_NOTICE = "Local development sign-in is enabled; public domain registration was skipped.";
export const DATABASE_FALLBACK = "Managed database is not available yet; using the bundled local database.";
export class ManagedStartupError extends Error {}
function refused(service: string, error: unknown) {
  if (error instanceof ManagedStartupError) return error;
  let reason = "The result could not be confirmed. Check the private runtime settings before retrying.";
  if (error instanceof PramaanError) {
    if (error.code === "invalid_request") reason = /Idempotency-Key/i.test(error.message) ? "A request ID header is required for this action." : "The request was refused. Check the app address and request settings.";
    else if (error.code === "unauthorized") reason = "Access was refused. Check the configured access credential.";
    else if (error.code === "rate_limited") reason = "Too many requests. Wait before trying again.";
    else if (error.code === "upstream_timeout") reason = "The service timed out; the result could not be confirmed.";
    else reason = "The service refused the request. Check the private runtime settings before retrying.";
    return new ManagedStartupError(`${service} could not be configured (${error.code}). ${reason}`);
  }
  return new ManagedStartupError(`${service} could not be configured. ${reason}`);
}
export class ManagedRuntime {
  private readonly file: string;
  constructor(private readonly p: Pramaan, private readonly directory: string, key: string) {
    this.file = path.join(directory, `${createHash("sha256").update(key).digest("hex").slice(0, 32)}.json`);
  }
  private async state(): Promise<State> {
    try { if ((await lstat(this.file)).isSymbolicLink()) throw new Error(); await chmod(this.file, 0o600); return JSON.parse(await readFile(this.file, "utf8")); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return {}; throw new Error("Managed service settings could not be read."); }
  }
  private async save(value: State) {
    const temp = `${this.file}.${randomUUID()}.pending`;
    try { await writeFile(temp, JSON.stringify(value), { mode: 0o600, flag: "wx" }); await rename(temp, this.file); }
    catch { throw new Error("Managed service settings could not be saved."); }
  }
  private async locked<T>(fn: (state: State) => Promise<T>) {
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    if ((await lstat(this.directory)).isSymbolicLink()) throw new Error("Managed service settings could not be saved.");
    await chmod(this.directory, 0o700);
    const lock = `${this.file}.lock`;
    const handle = await open(lock, "wx", 0o600).catch(() => { throw new Error("Managed service startup is already in progress. Check the private runtime lock before restarting."); });
    try { return await fn(await this.state()); } finally { await handle.close(); await unlink(lock); }
  }
  async backend(origin: string) {
    return this.locked(async state => {
      if (!state.backend) {
        if (!state.backendRequest) { state.backendRequest = `managed-signin-${randomUUID()}`; await this.save(state); }
        state.backend = await this.p.authBackendProvision({ idempotencyKey: state.backendRequest });
        await this.save(state);
      }
      const backend = managedBackend(state.backend);
      const address = new URL(origin);
      const publicOrigin = address.protocol === "https:" && address.hostname.includes(".") && !["localhost", "127.0.0.1", "[::1]"].includes(address.hostname) && !/^\d+\.\d+\.\d+\.\d+$/.test(address.hostname);
      if (!publicOrigin) return { ...backend, startupMessage: LOCAL_DOMAIN_NOTICE };
      if (state.domain !== origin) {
        if (state.domainRequest?.origin !== origin) { state.domainRequest = { origin, key: `managed-domains-${randomUUID()}` }; await this.save(state); }
        const result = await this.p.authBackendDomainsSet({ domains: [origin] }, { idempotencyKey: state.domainRequest.key });
        if (!result.allowedDomains.includes(origin)) throw new Error("Managed sign-in address could not be confirmed.");
        state.domain = origin; await this.save(state);
      }
      return backend;
    });
  }
  async signIn(origin: string) {
    try { return { mode: "managed" as const, ...await this.backend(origin) }; }
    catch (error) {
      if (error instanceof PramaanError && error.code === "upstream_unavailable") return { mode: "local" as const, startupMessage: "Managed sign-in is not available yet; using local sign-in." };
      throw refused("Managed sign-in", error);
    }
  }
  async database(localConnectionString: string) {
    return this.locked(async state => {
      if (state.database) return { mode: "managed" as const, connectionString: privateDatabaseAddress(state.database.connectionString), directConnectionString: privateDatabaseAddress(state.database.directConnectionString) };
      // Save the retry identity before a once-only credential response can be lost.
      if (state.databaseRequest) throw new Error("Managed database credentials need recovery. Do not provision again; an approved credential rotation may be needed.");
      state.databaseKey ??= `managed-database-${randomUUID()}`;
      state.databaseRequest = state.databaseKey; await this.save(state);
      try {
        const result = await this.p.dbPostgresProvision({ idempotencyKey: state.databaseRequest });
        if (!result.created || !result.connectionString || !result.directConnectionString) throw new ManagedStartupError("Managed database already exists, but its credentials were not returned. Restore this installation’s private runtime credentials; do not rotate a shared database without approval.");
        state.database = { connectionString: result.connectionString, directConnectionString: result.directConnectionString };
        delete state.databaseRequest; await this.save(state);
        return { mode: "managed" as const, ...state.database };
      } catch (error) {
        if (error instanceof PramaanError && error.code === "upstream_unavailable") {
          delete state.databaseRequest; await this.save(state);
          return { mode: "local" as const, connectionString: localConnectionString, directConnectionString: localConnectionString, startupMessage: DATABASE_FALLBACK };
        }
        if (error instanceof PramaanError && ["invalid_request", "unauthorized", "rate_limited", "spend_cap_reached", "connection_required", "not_found"].includes(error.code)) { delete state.databaseRequest; await this.save(state); }
        throw refused("Managed database", error);
      }
    });
  }
}
