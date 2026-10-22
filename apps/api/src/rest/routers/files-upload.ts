import { recordDocumentUpload } from "@business-operations/db/queries";
import { createHash, randomUUID } from "node:crypto";
import type { Context } from "@api/rest/types";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { putObject, signedUrl } from "@business-operations/storage";
import { HTTPException } from "hono/http-exception";
import { protectedMiddleware } from "../middleware";

const app = new OpenAPIHono<Context>();

const errorResponseSchema = z.object({
  error: z.string(),
});

const uploadResponseSchema = z.object({
  path: z.array(z.string()),
  url: z.string(),
});

// Session-authenticated upload into local storage. The dashboard sends the
// raw file; documents get signed links and profile images get stable local URLs.
app.use(...protectedMiddleware);

app.openapi(
  createRoute({
    method: "post",
    path: "/upload",
    summary: "Upload a file",
    operationId: "uploadFile",
    description:
      "Stores one file under the team's folder. Send the raw bytes as the request body with its media type; query parameters name the target folder and file.",
    tags: ["Files"],
    request: {
      query: z.object({
        bucket: z.enum(["vault", "avatars", "apps"]).default("vault"),
        folder: z.string().min(1),
        filename: z.string().min(1),
        contentType: z.string().min(1).max(255).default("application/octet-stream"),
      }),
      body: {
        content: {
          "application/octet-stream": {
            schema: { type: "string", format: "binary" },
          },
        },
      },
    },
    responses: {
      200: {
        description: "Upload result",
        content: {
          "application/json": { schema: uploadResponseSchema },
        },
      },
      400: {
        description: "Bad request",
        content: { "application/json": { schema: errorResponseSchema } },
      },
    },
  }),
  async (c) => {
    const teamId = c.get("teamId");
    const userId = c.get("session")?.user.id;
    if (!userId) throw new HTTPException(401, { message: "Authentication required" });
    const { bucket, folder, filename, contentType } = c.req.valid("query");
    const parts = folder.split("/");
    if (parts.some(part => !part || part === "." || part === ".." || part.includes("\\"))) throw new HTTPException(400, { message: "Choose a valid file folder." });
    const safeName = filename.replace(/[/\\?%*:|"<>]/g, "_");
    if (!safeName || [".", ".."].includes(safeName)) throw new HTTPException(400, { message: "Choose a valid filename." });
    if (bucket === "apps") {
      if (!teamId) throw new HTTPException(400, { message: "Choose a team first." });
      parts.unshift(teamId);
    } else if (!(parts[0] === teamId || bucket === "avatars" && parts[0] === userId)) {
      throw new HTTPException(403, { message: "Use your own file folder." });
    }
    let storagePath = [...parts, safeName].join("/");

    const body = await c.req.arrayBuffer();
    if (!body.byteLength) {
      throw new HTTPException(400, { message: "Empty upload body" });
    }

    if (bucket !== "vault") {
      const bytes = Buffer.from(body);
      const extension = bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? "png"
        : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 ? "jpg"
        : bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP" ? "webp" : null;
      if (!extension || bytes.length > 5 * 1024 * 1024) throw new HTTPException(400, { message: "Choose a PNG, JPEG or WebP image under 5 MB." });
      storagePath = `${parts[0]}/${randomUUID()}.${extension}`;
      await putObject({ bucket, path: storagePath, data: bytes });
      const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";
      return c.json({ path: storagePath.split("/"), url: `${base}/files/assets/${bucket}/${storagePath}` }, 200);
    }

    await putObject({
      bucket,
      path: storagePath,
      data: Buffer.from(body),
    });

    await recordDocumentUpload(c.get("db"), { teamId, ownerId: userId, pathTokens: storagePath.split("/"), contentType, size: body.byteLength, checksum: createHash("sha256").update(Buffer.from(body)).digest("hex") });

    // A day-long link: components that expect a URL out of an upload keep working.
    const { signedUrl: url } = await signedUrl({
      bucket,
      path: storagePath,
      expireIn: 24 * 60 * 60,
    });

    return c.json({ path: storagePath.split("/"), url }, 200);
  },
);

export default app;
