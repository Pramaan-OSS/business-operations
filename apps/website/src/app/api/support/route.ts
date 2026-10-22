import { sendFeedback } from "@business-operations/utils/send-feedback";
export async function POST(request: Request) {
  try {
    const data = await request.json() as Record<string, unknown>;
    if (typeof data.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email) || typeof data.subject !== "string" || !data.subject || data.subject.length > 200 || typeof data.message !== "string" || !data.message || data.message.length > 10000) return Response.json({ error: "Enter your email, subject and message." }, { status: 400 });
    await sendFeedback({ email: data.email, subject: data.subject, message: data.message });
    return Response.json({ sent: true });
  } catch { return Response.json({ error: "Support email is not set up yet. Set FEEDBACK_EMAIL and EMAIL_FROM." }, { status: 503 }); }
}
