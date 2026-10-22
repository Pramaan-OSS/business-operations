import { sql } from "drizzle-orm";
import { createRemoteJWKSet, type JWTPayload, jwtVerify } from "jose";

export type Session = {
  user: {
    id: string;
    email?: string;
    full_name?: string;
  };
  teamId?: string;
};

type SupabaseJWTPayload = JWTPayload & {
  app_metadata?: { managed_email?: string };
  user_metadata?: {
    email?: string;
    full_name?: string;
    [key: string]: string | undefined;
  };
};

// Primary: verify via JWKS (asymmetric ES256/RS256). jose caches the
// keyset in memory so only the first call hits the network.
const JWKS = createRemoteJWKSet(
  new URL(`${process.env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`),
);

// Fallback: HS256 shared secret for tokens issued before key rotation.
// Remove this once the legacy JWT secret is revoked in Supabase.
const HS256_SECRET = process.env.SUPABASE_JWT_SECRET
  ? new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET)
  : null;

async function extractSession(payload: JWTPayload): Promise<Session | null> {
  const p = payload as SupabaseJWTPayload;
  if (p.role !== "authenticated" || !p.sub || !/^[0-9a-f-]{36}$/i.test(p.sub)) return null;
  if (p.aal !== "aal2") {
    const { db } = await import("@business-operations/db/client");
    const factors = await db.execute(sql`SELECT 1 FROM auth.mfa_factors WHERE user_id = ${p.sub}::uuid AND status = 'verified' LIMIT 1`);
    if (factors.rows.length) return null;
  }
  return {
    user: {
      id: p.sub!,
      email: typeof p.app_metadata?.managed_email === "string" && p.app_metadata.managed_email ? p.app_metadata.managed_email : typeof p.email === "string" ? p.email : undefined,
      full_name: p.user_metadata?.full_name,
    },
  };
}

export async function verifyAccessToken(
  accessToken?: string,
): Promise<Session | null> {
  if (!accessToken) return null;

  try {
    const { payload } = await jwtVerify(accessToken, JWKS, { audience: "authenticated" });
    return await extractSession(payload);
  } catch {
    // JWKS verification failed -- try HS256 fallback if configured.
  }

  if (HS256_SECRET) {
    try {
      const { payload } = await jwtVerify(accessToken, HS256_SECRET, { audience: "authenticated" });
      return await extractSession(payload);
    } catch {
      // Both methods failed.
    }
  }

  return null;
}
