"use client";
import { Button } from "@business-operations/ui/button";
import { useRouter } from "next/navigation";
type Props = { id: string; provider: string; enrollmentId: string | null; institutionId: string;
  referenceId?: string | null; accessToken: string | null; onComplete: (type: "reconnect" | "sync") => void; variant?: "button" | "icon" };
export function ReconnectProvider(_props: Props) {
  const router = useRouter();
  return <Button variant="outline" onClick={() => router.push("/banking")}>Reconnect bank</Button>;
}
