import { signInReturnPath } from "@/utils/sign-in-return";
import { verifyManagedSignIn, checkManagedState, saveManagedIdentity } from "@business-operations/storage/managed-sign-in";
import { createClient } from "@business-operations/supabase/server";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
export async function POST(request: NextRequest) {
  const base = process.env.APP_URL || process.env.NEXT_PUBLIC_URL || "http://localhost:3001";
  if (request.headers.get("origin") !== new URL(base).origin) return NextResponse.json({ error: "Sign-in could not finish." }, { status: 403 });
  const store = await cookies();
  try {
    if (process.env.APP_SIGN_IN_MODE !== "managed" || !process.env.MANAGED_AUTH_URL || Number(request.headers.get("content-length") || 0) > 16384) throw new Error();
    const body = await request.json();
    checkManagedState(store.get("bo-managed-state")?.value, body.state);
    store.set("bo-managed-state", "", { path: "/", maxAge: 0 });
    const returnTo = signInReturnPath(store.get("bo-managed-return")?.value);
    store.set("bo-managed-return", "", { path: "/", maxAge: 0 });
    if (typeof body.token !== "string") throw new Error();
    const identity = await verifyManagedSignIn(body.token, process.env.MANAGED_AUTH_URL, base, process.env.ALLOWED_SIGN_IN);
    const admin = await createClient({ admin: true });
    const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email: identity.loginEmail, options: { data: { full_name: identity.displayName || "" } } });
    if (error || !data.properties.hashed_token || !data.user?.id) throw new Error();
    const verificationType = data.properties.verification_type;
    if (verificationType !== "signup" && verificationType !== "magiclink") throw new Error();
    const updated = await admin.auth.admin.updateUserById(data.user.id, { app_metadata: { managed_user_id: identity.managedUserId, managed_auth_origin: identity.authOrigin, managed_email: identity.email || "", managed_email_verified: identity.emailVerified } });
    if (updated.error) throw new Error();
    if (identity.email) {
      const profile = await admin.from("users").update({ email: identity.email }).eq("id", data.user.id);
      if (profile.error) throw new Error();
    }
    await saveManagedIdentity(data.user.id, { userId: identity.managedUserId, authOrigin: identity.authOrigin });
    const local = await createClient();
    const session = await local.auth.verifyOtp({ token_hash: data.properties.hashed_token, type: verificationType });
    if (session.error) throw new Error();
    const profile = await admin.from("users").select("team_id").eq("id", data.user.id).maybeSingle();
    if (profile.error) throw new Error();
    const redirectTo = profile.data?.team_id ? returnTo : `/onboarding?return_to=${encodeURIComponent(returnTo)}`;
    return NextResponse.json({ ok: true, redirectTo }, { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "Sign-in could not finish. Start again." }, { status: 401, headers: { "Cache-Control": "no-store" } }); }
}
