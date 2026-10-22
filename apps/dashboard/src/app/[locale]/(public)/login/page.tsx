import { signInReturnPath } from "@/utils/sign-in-return";
import { ManagedSignIn } from "@/components/managed-sign-in";
import { PasswordSignIn } from "@/components/password-sign-in";
import { enterpriseConnections } from "@business-operations/storage/sign-in";
export const metadata = { title: "Sign in | Business Operations" };
export default async function Page({ searchParams }: { searchParams: Promise<{ error?: string; method?: string; return_to?: string }> }) {
  const { error, method, return_to } = await searchParams;
  let connections: Awaited<ReturnType<typeof enterpriseConnections>> = [];
  if (process.env.PRAMAAN_ENTERPRISE_ORGANIZATION_REF) {
    try { connections = await enterpriseConnections(process.env.PRAMAAN_ENTERPRISE_ORGANIZATION_REF); } catch { /* Optional sign-in stays unavailable. */ }
  }
  const managed = process.env.APP_SIGN_IN_MODE === "managed" && !!process.env.MANAGED_AUTH_URL;
  const own = process.env.APP_OWN_SIGN_IN === "1" && method === "own";
  return <main className="bo-card bo-entry mx-auto max-w-md space-y-6"><h1 className="text-2xl">Business Operations</h1>{managed && !own ? <ManagedSignIn authUrl={process.env.MANAGED_AUTH_URL!} /> : <PasswordSignIn />}{managed && !own && process.env.APP_OWN_SIGN_IN === "1" && <a href={`/login?method=own&return_to=${encodeURIComponent(signInReturnPath(return_to))}`} className="underline">Use installation sign-in</a>}{error && <p role="alert">Sign-in could not finish. Start again.</p>}{process.env.PRAMAAN_SOCIAL_PROVIDER_KEY && process.env.PRAMAAN_SOCIAL_AUTHORIZATION_URL && process.env.PRAMAAN_SOCIAL_CLIENT_ID ? <a className="block underline" href="/api/auth/federated/start">Continue with connected sign-in</a> : null}{connections.filter(row => row.ref).map(row => <a className="block underline" key={row.ref} href={`/api/auth/federated/start?connection=${encodeURIComponent(row.ref!)}`}>Continue with {row.name}</a>)}</main>;
}
