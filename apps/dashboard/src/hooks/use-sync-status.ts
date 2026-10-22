import { useEffect, useState } from "react";
import { useJobStatus } from "./use-job-status";
export function useSyncStatus({ runId }: { runId?: string; accessToken?: string }) {
  const job = useJobStatus({ jobId: runId });
  const [status, setStatus] = useState<"FAILED" | "SYNCING" | "COMPLETED" | null>(null);
  useEffect(() => {
    if (!runId) return;
    if (job.status === "completed") setStatus("COMPLETED");
    else if (job.status === "failed" || job.queryError) setStatus("FAILED");
    else setStatus("SYNCING");
  }, [runId, job.status, job.queryError]);
  return { status, setStatus, result: job.result };
}
