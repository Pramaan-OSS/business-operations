"use server";
import { sendFeedback } from "@business-operations/utils/send-feedback";
import { z } from "zod";
import { authActionClient } from "./safe-action";
export const sendSupportAction = authActionClient.schema(z.object({ subject: z.string().min(1).max(200), priority: z.string(), type: z.string(), message: z.string().min(1).max(10000), url: z.string().optional() }))
  .metadata({ name: "send-support" }).action(({ parsedInput, ctx: { user } }) => sendFeedback({ email: user.email || "", name: user.fullName || "", subject: parsedInput.subject, message: parsedInput.message, url: parsedInput.url }));
