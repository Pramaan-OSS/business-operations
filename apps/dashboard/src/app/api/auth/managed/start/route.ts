import { signInReturnPath } from "@/utils/sign-in-return";
import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
export async function POST(request: NextRequest) {
  const base = process.env.APP_URL || process.env.NEXT_PUBLIC_URL || "http://localhost:3001";
  if (request.headers.get("origin") !== new URL(base).origin) return NextResponse.json({ error: "Sign-in could not start." }, { status: 403 });
  if (process.env.APP_SIGN_IN_MODE !== "managed" || !process.env.MANAGED_AUTH_URL) return NextResponse.json({ error: "Managed sign-in is not available yet." }, { status: 503 });
  const body = await request.json().catch(() => ({}));
  const returnTo = signInReturnPath(body && typeof body === "object" ? body.returnTo : undefined);
  const state = randomBytes(32).toString("base64url");
  const response = NextResponse.json({ state }, { headers: { "Cache-Control": "no-store" } });
  response.cookies.set("bo-managed-state", state, { httpOnly: true, secure: new URL(base).protocol === "https:", sameSite: "lax", maxAge: 600, path: "/" });
  response.cookies.set("bo-managed-return", returnTo, { httpOnly: true, secure: new URL(base).protocol === "https:", sameSite: "lax", maxAge: 600, path: "/" });
  return response;
}
