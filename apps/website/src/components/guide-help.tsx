"use client";
import { useState } from "react";
export function GuideHelp() {
  const [question, setQuestion] = useState(""); const [answer, setAnswer] = useState(""); const [busy, setBusy] = useState(false);
  return <section><h2>Ask about the product</h2><form onSubmit={async event => { event.preventDefault(); setBusy(true); try { const response = await fetch("/api/docs/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question }) }); const result = await response.json(); setAnswer(result.text || result.error || "This feature is not available yet."); } catch { setAnswer("The answer could not be confirmed. Try again later."); } finally { setBusy(false); } }}><label>Your question<textarea required maxLength={2000} value={question} onChange={event => setQuestion(event.target.value)} /></label><button type="submit" disabled={busy}>{busy ? "Checking…" : "Ask"}</button></form>{answer && <p role="status" style={{ whiteSpace: "pre-wrap" }}>{answer}</p>}</section>;
}
