import type { Context } from "@api/rest/types";
import { OpenAPIHono } from "@hono/zod-openapi";
import { downloadRouter } from "./download";
import { serveRouter } from "./serve";
import { signedRouter } from "./signed";

const app = new OpenAPIHono<Context>();

app.route("/", serveRouter);

app.route("/download", downloadRouter);

app.route("/", signedRouter);

export { app as filesRouter };
