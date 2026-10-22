"use client";
import { useEffect, useState } from "react";
import { createManagedAuthClient, managedBrowserToken } from "@business-operations/pramaan/managed-browser";
import { signInReturnPath } from "@/utils/sign-in-return";
import { Button } from "@business-operations/ui/button";
async function start() {
  const response = await fetch("/api/auth/managed/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ returnTo: new URL(window.location.href).searchParams.get("return_to") }) });
  if (!response.ok) throw new Error();
  return (await response.json()).state as string;
}
export async function finishManagedBrowser(authUrl: string, state: string, verifier?: string) {
  const client = createManagedAuthClient(authUrl);
  const token = await managedBrowserToken(client, verifier, () => {
    if (window.location.pathname.endsWith("/managed-return")) window.history.replaceState(null, "", window.location.pathname);
  });
  const response = await fetch("/api/auth/managed/finish", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, state }) });
  if (!response.ok) throw new Error();
  const result = await response.json();
  window.location.assign(signInReturnPath(result.redirectTo));
}
export function ManagedSignIn({ authUrl }: { authUrl: string }) {
  const [register, setRegister] = useState(false), [email, setEmail] = useState(""), [password, setPassword] = useState(""), [name, setName] = useState(""), [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);
  useEffect(() => { setReady(true); }, []);
  const failure = () => setMessage("Sign-in could not finish. Check your details and try again.");
  return <section className="space-y-4"><Button className="w-full" disabled={busy || !ready} onClick={async () => {
    setBusy(true); setMessage("");
    try { const state = await start(); const client = createManagedAuthClient(authUrl); const result = await client.signIn.social({ provider: "google", callbackURL: `${window.location.origin}/managed-return?state=${encodeURIComponent(state)}` }); if (result.error) throw new Error(); }
    catch { failure(); setBusy(false); }
  }}>Continue with managed sign-in</Button><form className="space-y-4" onSubmit={async event => {
    event.preventDefault(); setBusy(true); setMessage("");
    try { const state = await start(); const client = createManagedAuthClient(authUrl); const result = register ? await client.signUp.email({ email, password, name }) : await client.signIn.email({ email, password }); if (result.error) throw new Error(); await finishManagedBrowser(authUrl, state); }
    catch { failure(); } finally { setBusy(false); }
  }}><h2 className="text-xl">{register ? "Create your account" : "Sign in"}</h2>{register && <label className="block">Your name<input disabled={busy || !ready} className="block border bg-background p-2 w-full" required autoComplete="name" value={name} onChange={event => setName(event.target.value)} /></label>}<label className="block">Email<input disabled={busy || !ready} type="email" className="block border bg-background p-2 w-full" required autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} /></label><label className="block">Password<input disabled={busy || !ready} type="password" className="block border bg-background p-2 w-full" required minLength={12} autoComplete={register ? "new-password" : "current-password"} value={password} onChange={event => setPassword(event.target.value)} /></label><Button disabled={busy || !ready}>{register ? "Create account" : "Sign in"}</Button><Button type="button" variant="outline" disabled={busy || !ready} onClick={() => {setRegister(!register);setMessage("");}}>{register ? "I have an account" : "Create an account"}</Button>{message && <p role="status">{message}</p>}</form><p className="text-sm text-muted-foreground">Sign-in is provided through Pramaan.</p></section>;
}
