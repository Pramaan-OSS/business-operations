import { timingSafeEqual } from "node:crypto";
function equal(a: string, b: string) { const x = Buffer.from(a); const y = Buffer.from(b); return !!x.length && x.length === y.length && timingSafeEqual(x, y); }
const allowed = process.env.NEXT_PUBLIC_URL || "http://localhost:3001";
Bun.serve({ port: 65431, hostname: "0.0.0.0", async fetch(request) {
  const url = new URL(request.url);
  const headers = new Headers({ "Access-Control-Allow-Origin": allowed, "Access-Control-Allow-Headers": "authorization,apikey,content-type,x-client-info,x-supabase-api-version", "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,PATCH,OPTIONS", "Vary": "Origin" });
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (process.env.APP_SIGN_IN_MODE === "managed" && process.env.APP_OWN_SIGN_IN !== "1" && (url.pathname === "/auth/v1/signup" || url.pathname === "/auth/v1/token" && url.searchParams.get("grant_type") === "password")) return new Response("Use managed sign-in.", { status: 403, headers });
  let target: string;
  if (url.pathname.startsWith("/auth/v1/")) target = `${process.env.LOCAL_AUTH_INTERNAL_URL || "http://auth:9999"}${url.pathname.slice(8)}${url.search}`;
  else if (url.pathname.startsWith("/rest/v1/")) {
    if (!equal(request.headers.get("x-local-rest-key") || "", process.env.INTERNAL_API_KEY || "")) return new Response("Use the application API.", { status: 403, headers });
    target = `${process.env.LOCAL_REST_INTERNAL_URL || "http://rest:3000"}${url.pathname.slice(8)}${url.search}`;
  } else return new Response("Not found.", { status: 404, headers });
  try {
    const forwarded = new Headers(request.headers);
    forwarded.delete("host"); forwarded.delete("x-local-rest-key");
    const result = await fetch(target, { method: request.method, headers: forwarded, body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body, redirect: "manual" });
    for (const [key, value] of result.headers) headers.set(key, value);
    headers.set("Access-Control-Allow-Origin", allowed);
    return new Response(result.body, { status: result.status, headers });
  } catch { return new Response("The local service is starting. Try again shortly.", { status: 503, headers }); }
} });
