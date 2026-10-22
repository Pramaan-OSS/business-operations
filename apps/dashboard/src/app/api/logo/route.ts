import { getSession } from "@business-operations/supabase/cached-queries";
import { getCompanyLogo } from "@business-operations/storage/logos";
import { unavailableMessage } from "@business-operations/pramaan";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { data: { session } } = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  const domain = request.nextUrl.searchParams.get("domain");
  const name = request.nextUrl.searchParams.get("name");
  if (domain ? !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(domain) : !name || name.length > 256)
    return NextResponse.json({ error: "Enter a company website or name." }, { status: 400 });
  try {
    const logo = await getCompanyLogo(domain ? { domain } : { name: name! });
    return new NextResponse(new Uint8Array(logo.data), { headers: { "Content-Type": logo.contentType, "Cache-Control": "private, max-age=86400", "X-Content-Type-Options": "nosniff" } });
  } catch (error) {
    return NextResponse.json({ error: unavailableMessage(error) }, { status: 503 });
  }
}
