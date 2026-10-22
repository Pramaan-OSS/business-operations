import { finishFederatedSignIn } from "@business-operations/storage/sign-in";
import { createClient } from "@business-operations/supabase/server";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
export async function GET(request: NextRequest) {
  const base = process.env.NEXT_PUBLIC_URL || "http://localhost:3001";
  const cookieStore = await cookies();
  const id = cookieStore.get("bo-sign-in")?.value;
  cookieStore.set("bo-sign-in", "", { maxAge: 0, path: "/api/auth/federated" });
  try {
    if (!id || !request.nextUrl.searchParams.get("code") || !request.nextUrl.searchParams.get("state")) throw new Error("Invalid callback");
    const identity = await finishFederatedSignIn(id, request.nextUrl.searchParams.get("state")!, request.nextUrl.searchParams.get("code")!);
    const admin = await createClient({ admin: true });
    const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email: identity.loginEmail,
      options: { data: { full_name: identity.displayName || "", external_identity: identity.identityKey, claimed_email: identity.claimedEmail, claimed_email_verified: identity.emailVerified } } });
    if (error || !data.properties.hashed_token) throw new Error("Local sign-in unavailable");
    const client = await createClient();
    const session = await client.auth.verifyOtp({ token_hash: data.properties.hashed_token, type: "magiclink" });
    if (session.error) throw session.error;
    return NextResponse.redirect(`${base}/`);
  } catch { return NextResponse.redirect(`${base}/login?error=Sign-in%20could%20not%20finish.%20Start%20again.`); }
}
