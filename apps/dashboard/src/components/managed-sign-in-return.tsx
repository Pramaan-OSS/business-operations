"use client";
import { useEffect, useRef, useState } from "react";
import { finishManagedBrowser } from "./managed-sign-in";
export function ManagedSignInReturn({ authUrl }: { authUrl: string }) {
  const started = useRef(false); const [failed, setFailed] = useState(false);
  useEffect(() => { if (started.current) return; started.current = true; const query = new URL(window.location.href).searchParams; const state = query.get("state"), verifier = query.get("neon_auth_session_verifier") || undefined; if (!state) {window.history.replaceState(null, "", window.location.pathname);setFailed(true);return;} void finishManagedBrowser(authUrl, state, verifier).catch(() => { window.history.replaceState(null, "", window.location.pathname); setFailed(true); }); }, [authUrl]);
  return <main className="bo-card bo-entry mx-auto max-w-md"><p role="status">{failed ? "Sign-in could not finish. Start again." : "Finishing sign-in…"}</p>{failed && <a href="/login" className="underline">Back to sign in</a>}</main>;
}
