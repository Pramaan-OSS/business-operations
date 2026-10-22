import { pramaanFromEnv, unavailableMessage } from "@business-operations/pramaan";
const requests = new Map<string, { count: number; reset: number }>();
export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const now = Date.now();
  for (const [key, value] of requests) if (value.reset <= now) requests.delete(key);
  const limit = requests.get(ip) || { count: 0, reset: now + 3600000 };
  if (++limit.count > 10 || requests.size > 10000) return Response.json({ error: "Too many questions. Try again later." }, { status: 429 });
  requests.set(ip, limit);
  const p = pramaanFromEnv();
  if (!p) return Response.json({ error: "Add PRAMAAN_API_KEY to .env" }, { status: 422 });
  try {
    const input = await request.json() as { question?: unknown };
    if (typeof input.question !== "string" || !input.question.trim() || input.question.length > 2000) return Response.json({ error: "Enter a question of up to 2000 characters." }, { status: 400 });
    const result = await p.llmChat({ messages: [{ role: "system", content: "Answer questions about Business Operations using these facts only: local PostgreSQL, local file storage, local Redis jobs; manual transaction and receipt upload; customers, invoices, time tracking and financial reports. All outside calls use Pramaan. Bank feeds and mailbox reads are not available yet live. Connecting banks starts monthly per-account rental after authorisation. Connected apps come from a catalogue and may grant broad access. Sending and financial actions require separate approval. Workflows have review, approval, status and cancel. An uncertain effect requires checking the connected account first. Email/password and authenticator sign-in are local. Optional social and enterprise sign-in use Pramaan. EMAIL_FROM enables verification and invitations. Never invent a feature, provider, price or setup value. Use plain words." }, { role: "user", content: input.question }], maxTokens: 256 });
    return Response.json({ text: result.text || "An answer could not be confirmed." });
  } catch (error) { return Response.json({ error: unavailableMessage(error) }, { status: 503 }); }
}
