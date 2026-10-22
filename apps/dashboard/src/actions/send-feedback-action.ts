"use server";
import { sendFeedback } from "@business-operations/utils/send-feedback";
import { z } from "zod";
import { authActionClient } from "./safe-action";
export const sendFeebackAction = authActionClient.schema(z.object({ feedback: z.string().min(1).max(10000) }))
  .metadata({ name: "send-feedback" }).action(({ parsedInput, ctx: { user } }) => sendFeedback({ email: user.email || "", name: user.fullName || "", subject: "Product feedback", message: parsedInput.feedback }));
