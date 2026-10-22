import type { Context } from "@api/rest/types";
import { proxyFileSchema } from "@api/schemas/files";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { HTTPException } from "hono/http-exception";
import { withDatabase } from "../../middleware/db";
import { withFileAuth } from "../../middleware/file-auth";
import { withClientIp } from "../../middleware/ip";
import { getObject } from "@business-operations/storage";
import { normalizeAndValidatePath } from "./utils";

const app = new OpenAPIHono<Context>();

// Profile and app images are public display assets; documents never use this route.
app.get("/assets/:bucket/:owner/:filename", async c => {
  const { bucket, owner, filename } = c.req.param();
  if (!["avatars", "apps"].includes(bucket) || !/^[a-f0-9-]{36}$/i.test(owner) || !/^[a-f0-9-]{36}\.(png|jpg|webp)$/i.test(filename)) throw new HTTPException(404, { message: "Image not found." });
  const image = await getObject({ bucket, path: `${owner}/${filename}` });
  if (!image) throw new HTTPException(404, { message: "Image not found." });
  return new Response(new Uint8Array(image.data), { headers: { "Content-Type": image.contentType, "X-Content-Type-Options": "nosniff", "Cache-Control": "public, max-age=31536000, immutable" } });
});

const errorResponseSchema = z.object({
  error: z.string(),
});

app.openapi(
  createRoute({
    method: "get",
    path: "/proxy",
    summary: "Proxy file from storage",
    operationId: "proxyFile",
    "x-speakeasy-name-override": "proxy",
    description:
      "Proxies a file from storage. Requires team file key (fk) query parameter for access.",
    tags: ["Files"],
    request: {
      query: proxyFileSchema,
    },
    responses: {
      200: {
        description: "File content",
        content: {
          "application/octet-stream": {
            schema: {
              type: "string",
              format: "binary",
            },
          },
        },
      },
      400: {
        description: "Bad request",
        content: {
          "application/json": {
            schema: errorResponseSchema,
          },
        },
      },
      404: {
        description: "Not found",
        content: {
          "application/json": {
            schema: errorResponseSchema,
          },
        },
      },
      500: {
        description: "Internal server error",
        content: {
          "application/json": {
            schema: errorResponseSchema,
          },
        },
      },
    },
    middleware: [withClientIp, withDatabase, withFileAuth],
  }),
  async (c) => {
    const { filePath } = c.req.valid("query");
    const { normalizedPath } = normalizeAndValidatePath(filePath);

    const file = await getObject({
      bucket: "vault",
      path: normalizedPath,
    });

    if (!file) {
      throw new HTTPException(404, {
        message: "File not found",
      });
    }

    const blob = file.data;
    const contentType = file.contentType;

    // Set cache headers for images (long cache for immutable content)
    const headers: Record<string, string> = {
      "Content-Type": contentType,
      "Cross-Origin-Resource-Policy": "cross-origin",
    };

    // Add cache headers for images
    if (contentType.startsWith("image/")) {
      headers["Cache-Control"] = "public, max-age=31536000, immutable";
    }

    return new Response(blob, {
      headers,
    });
  },
);

export { app as serveRouter };
