import { createAuthClient } from "better-auth/client";
import { jwtClient } from "better-auth/client/plugins";

type Reply<T> = { data: T | null; error: unknown };
export interface ManagedAuthClient {
  signIn: { email(input: { email: string; password: string }): Promise<Reply<unknown>>; social(input: { provider: "google"; callbackURL: string }): Promise<Reply<unknown>> };
  signUp: { email(input: { email: string; password: string; name: string }): Promise<Reply<unknown>> };
  getSession(input: { query: { neon_auth_session_verifier: string }; fetchOptions: { credentials: "include" } }): Promise<Reply<unknown>>;
  token(): Promise<Reply<{ token: string }>>;
}
/** Browser calls go only to the sign-in address returned by app-owned provisioning. */
export function createManagedAuthClient(authUrl: string, fetcher?: typeof fetch): ManagedAuthClient {
  const url = new URL(authUrl);
  if (url.protocol !== "https:" || url.username || url.password || url.hash) throw new Error("Managed sign-in is not ready.");
  return createAuthClient({ baseURL: url.href, plugins: [jwtClient()], ...(fetcher ? { fetchOptions: { customFetchImpl: fetcher } } : {}) }) as unknown as ManagedAuthClient;
}
export async function managedBrowserToken(client: ManagedAuthClient, verifier?: string, sessionReady?: () => void) {
  if (verifier) {
    const session = await client.getSession({ query: { neon_auth_session_verifier: verifier }, fetchOptions: { credentials: "include" } });
    if (session.error || !session.data) throw new Error("Sign-in could not be confirmed.");
  }
  sessionReady?.();
  const result = await client.token();
  if (result.error || !result.data?.token) throw new Error("Sign-in could not be confirmed.");
  return result.data.token;
}
