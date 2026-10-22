import { OpenAPIHono } from "@hono/zod-openapi";
import type { Context } from "@api/rest/types";
export const webhookRouter = new OpenAPIHono<Context>();
