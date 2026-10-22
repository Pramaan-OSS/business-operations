"use server";
import { z } from "zod";
import { authActionClient } from "@/actions/safe-action";
export const reconnectConnectionAction = authActionClient.schema(z.object({ connectionId: z.string(), provider: z.string() }))
  .metadata({ name: "reconnect-connection" }).action(async () => { throw new Error("Reconnect your bank from Bank feeds."); });
