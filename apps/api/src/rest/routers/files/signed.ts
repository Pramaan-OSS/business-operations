import type { Context } from "@api/rest/types";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { getObject, verifySignedUrl } from "@business-operations/storage";
import { HTTPException } from "hono/http-exception";

const app = new OpenAPIHono<Context>();

const errorResponseSchema = z.object({
  error: z.string(),
});

const signedQuerySchema = z.object({
  bucket: z.string().min(1),
  path: z.string().min(1),
  expiresAt: z.coerce.number(),
  signature: z.string().min(1),
  download: z.string().optional(),
});

// Serves a stored object for a short-lived signed URL made by the storage module.
app.openapi(
  createRoute({
    method: "get",
    path: "/signed",
    summary: "Download a file through a signed URL",
    operationId: "signedDownload",
    description:
      "Streams a stored object. The query parameters carry an HMAC token over bucket, path and expiry made by the storage module; no session is needed.",
    tags: ["Files"],
    request: {
      query: signedQuerySchema,
    },
    responses: {
      200: {
        description: "File content",
        content: {
          "application/octet-stream": {
            schema: { type: "string", format: "binary" },
          },
        },
      },
      403: {
        description: "Invalid or expired signature",
        content: {
          "application/json": { schema: errorResponseSchema },
        },
      },
      404: {
        description: "File not found",
        content: {
          "application/json": { schema: errorResponseSchema },
        },
      },
    },
  }),
  async (c) => {
    const { bucket, path, expiresAt, signature, download } = c.req.valid("query");

    const valid = verifySignedUrl({ bucket, path, expiresAt, signature });
    if (!valid) {
      throw new HTTPException(403, { message: "This link has expired." });
    }

    const file = await getObject({ bucket, path });
    if (!file) {
      throw new HTTPException(404, { message: "File not found" });
    }

    const headers: Record<string, string> = {
      "Content-Type": file.contentType,
      "Cross-Origin-Resource-Policy": "cross-origin",
    };
    if (download === "1") {
      const filename = path.split("/").at(-1) || "file";
      headers["Content-Disposition"] = `attachment; filename="${filename}"`;
    }

    return new Response(new Uint8Array(file.data), { headers });
  },
);

export { app as signedRouter };
