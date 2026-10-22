"use client";
import { useEffect, useState } from "react";
import { createClient } from "@business-operations/supabase/client";
import { signInReturnPath } from "@/utils/sign-in-return";
import { Button } from "@business-operations/ui/button";
export function PasswordSignIn() {
  const [ready, setReady] = useState(false);
  useEffect(() => { setReady(true); }, []);
  const [register, setRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  return <form className="space-y-4" onSubmit={async event => {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const client = createClient();
      const result = register ? await client.auth.signUp({ email, password, options: { data: { full_name: name } } }) : await client.auth.signInWithPassword({ email, password });
      if (result.error) { setMessage("Sign-in could not finish. Check your details and try again."); return; }
      const returnTo = signInReturnPath(new URL(window.location.href).searchParams.get("return_to"));
      if (result.data.session) window.location.href = register ? `/onboarding?return_to=${encodeURIComponent(returnTo)}` : returnTo;
      else setMessage("Check your email to finish creating this account.");
    } catch { setMessage("Sign-in is not available yet. Check that the local services are running."); }
    finally { setBusy(false); }
  }}><h2 className="text-xl">{register ? "Create your account" : "Sign in"}</h2>{register && <label className="block">Your name<input disabled={busy || !ready} className="block border bg-background p-2 w-full" required autoComplete="name" value={name} onChange={event => setName(event.target.value)} /></label>}<label className="block">Email<input disabled={busy || !ready} type="email" className="block border bg-background p-2 w-full" required autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} /></label><label className="block">Password<input disabled={busy || !ready} type="password" className="block border bg-background p-2 w-full" required minLength={12} autoComplete={register ? "new-password" : "current-password"} value={password} onChange={event => setPassword(event.target.value)} /></label><Button data-thread disabled={busy || !ready}>{register ? "Create account" : "Sign in"}</Button><Button type="button" disabled={busy || !ready} variant="outline" onClick={() => { setRegister(!register); setMessage(""); }}>{register ? "I have an account" : "Create an account"}</Button>{message && <p role="status">{message}</p>}<p className="text-sm text-muted-foreground">Your account and password stay in this installation. You can add an authenticator in account security after signing in.</p></form>;
}
