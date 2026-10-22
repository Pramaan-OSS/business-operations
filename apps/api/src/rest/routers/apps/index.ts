import type { Context } from "@api/rest/types";
import { OpenAPIHono } from "@hono/zod-openapi";
const app = new OpenAPIHono<Context>();
export { app as appsRouter };
