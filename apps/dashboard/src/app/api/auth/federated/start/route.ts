import { enterpriseConnections, startFederatedSignIn } from "@business-operations/storage/sign-in";
import { NextRequest, NextResponse } from "next/server";
export async function GET(request: NextRequest) {
  const base = process.env.NEXT_PUBLIC_URL || "http://localhost:3001";
  const redirectUri = `${base}/api/auth/federated/callback`;
  try {
    const connectionRef = request.nextUrl.searchParams.get("connection");
    if (connectionRef) {
      const organization = process.env.PRAMAAN_ENTERPRISE_ORGANIZATION_REF;
      if (!organization || !(await enterpriseConnections(organization)).some(row => row.ref === connectionRef)) throw new Error("Not configured");
    } else if (!process.env.PRAMAAN_SOCIAL_PROVIDER_KEY) throw new Error("Not configured");
    const result = await startFederatedSignIn({ redirectUri, providerKey: process.env.PRAMAAN_SOCIAL_PROVIDER_KEY || "enterprise", connectionRef: connectionRef || undefined,
      authorizationUrl: process.env.PRAMAAN_SOCIAL_AUTHORIZATION_URL, clientId: process.env.PRAMAAN_SOCIAL_CLIENT_ID, scope: process.env.PRAMAAN_SOCIAL_SCOPE });
    const response = NextResponse.redirect(result.authorizationUrl);
    response.cookies.set("bo-sign-in", result.id, { httpOnly: true, sameSite: "lax", secure: new URL(base).protocol === "https:", maxAge: 600, path: "/api/auth/federated" });
    return response;
  } catch { return NextResponse.redirect(`${base}/login?error=Sign-in%20is%20not%20available%20yet.`); }
}
