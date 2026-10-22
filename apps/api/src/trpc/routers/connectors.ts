import { getCatalog } from "@api/connected-apps/catalog";
import { createTRPCRouter, protectedProcedure } from "@api/trpc/init";
import { ConnectedApps } from "@business-operations/storage/connected-apps";
import { unavailableMessage, type JsonObject } from "@business-operations/pramaan";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
const app = z.string().regex(/^[a-z0-9_-]{1,64}$/);
const request = z.object({ app, action: z.string().regex(/^[A-Z][A-Z0-9_]{1,127}$/), input: z.record(z.string(), z.unknown()) });
function owner(teamId: string | undefined, userId: string) {
  if (!teamId) throw new TRPCError({ code: "FORBIDDEN", message: "Choose a team first." });
  return `${teamId}.${userId}`;
}
async function safely<T>(action: (client: ConnectedApps) => Promise<T>) {
  try { return await action(new ConnectedApps()); }
  catch (error) { throw new TRPCError({ code: "PRECONDITION_FAILED", message: unavailableMessage(error) }); }
}
export const connectorsRouter = createTRPCRouter({
  list: protectedProcedure.query(() => safely(() => getCatalog())),
  search: protectedProcedure.input(z.object({ query: z.string().min(1).max(500), app: app.optional() }))
    .query(({ input }) => safely(client => client.catalog(input.query, input.app))),
  connections: protectedProcedure.query(({ ctx }) => safely(async client => {
    const result = await client.connections(owner(ctx.teamId, ctx.session.user.id));
    return result.results.filter(row => row.status === "active").map(row => ({ slug: row.app, name: row.app, logo: null, connectedAccountId: row.app }));
  })),
  detail: protectedProcedure.input(z.object({ slug: app })).query(({ input }) => safely(async client => {
    const rows = await client.catalog(input.slug, input.slug);
    return { slug: input.slug, name: input.slug, description: rows[0]?.description || "", logo: null,
      appUrl: null, categories: [] as { name: string; slug: string }[], toolsCount: rows.length, triggersCount: 0,
      authSchemes: [] as string[], tools: rows.map(row => ({ slug: row.action, name: row.action, description: row.description || "", tags: row.readOnly ? ["Read only"] : ["Approval required"] })) };
  })),
  authorize: protectedProcedure.input(z.object({ toolkit: app, callbackUrl: z.string().url().optional(), approved: z.literal(true) }))
    .mutation(({ ctx, input }) => safely(async client => {
      const base = process.env.BUSINESS_OPERATIONS_DASHBOARD_URL || "http://localhost:3001";
      const result = await client.start(owner(ctx.teamId, ctx.session.user.id), input.toolkit, new URL("/apps", base).href, input.approved);
      return { redirectUrl: result.connectUrl };
    })),
  disconnect: protectedProcedure.input(z.object({ connectedAccountId: app }))
    .mutation(({ ctx, input }) => safely(async client => {
      await client.disconnect(owner(ctx.teamId, ctx.session.user.id), input.connectedAccountId);
      return { success: true };
    })),
  read: protectedProcedure.input(request).mutation(({ ctx, input }) => safely(client => client.read(owner(ctx.teamId, ctx.session.user.id), input.app, input.action, input.input as JsonObject))),
  review: protectedProcedure.input(request).mutation(({ ctx, input }) => safely(client => client.review(owner(ctx.teamId, ctx.session.user.id), input.app, input.action, input.input as JsonObject))),
  approve: protectedProcedure.input(z.object({ id: z.string().uuid(), approved: z.literal(true) }))
    .mutation(({ ctx, input }) => safely(client => client.approve(owner(ctx.teamId, ctx.session.user.id), input.id, input.approved))),
  status: protectedProcedure.input(z.object({ id: z.string().uuid() }))
    .query(({ ctx, input }) => safely(client => client.status(owner(ctx.teamId, ctx.session.user.id), input.id))),
});
