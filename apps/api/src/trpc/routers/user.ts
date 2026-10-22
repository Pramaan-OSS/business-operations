import { emailSender, pramaanKeySet } from "@business-operations/pramaan";
import { disconnectPersonalApps, disconnectTeamServices } from "@api/services/team-disconnect";
import { renameManagedIdentity, deleteManagedIdentity } from "@business-operations/storage/managed-sign-in";
import { hasVerifiedEmail, requestEmailVerification, confirmEmailVerification } from "@business-operations/storage/email-verification";
import { updateUserSchema } from "@api/schemas/users";
import { createAdminClient } from "@api/services/supabase";
import { createTRPCRouter, protectedProcedure } from "@api/trpc/init";
import { withRetryOnPrimary } from "@api/utils/db-retry";
import { teamCache } from "@business-operations/cache/team-cache";
import {
  deleteUser,
  getUserDeletionPlan,
  getUserById,
  getUserInvites,
  switchUserTeam,
  updateUser,
} from "@business-operations/db/queries";
import { generateFileKey } from "@business-operations/encryption";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

export const userRouter = createTRPCRouter({
  emailVerification: protectedProcedure.query(async ({ ctx }) => ({ verified: await hasVerifiedEmail(ctx.session.user.id, ctx.session.user.email), configured: pramaanKeySet() })),
  requestEmailVerification: protectedProcedure.input(z.object({ approved: z.literal(true) })).mutation(async ({ ctx }) => {
    if (!ctx.session.user.email || ctx.session.user.email.endsWith("@identity.localhost")) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Use an email account before requesting verification." });
    return requestEmailVerification(ctx.session.user.id, ctx.session.user.email, emailSender());
  }),
  confirmEmailVerification: protectedProcedure.input(z.object({ code: z.string().regex(/^\d{6}$/) })).mutation(({ ctx, input }) => {
    if (!ctx.session.user.email) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Email is required." });
    return confirmEmailVerification(ctx.session.user.id, ctx.session.user.email, input.code);
  }),
  me: protectedProcedure.query(async ({ ctx: { db, session } }) => {
    // Cookie-based approach handles replication lag for new users via x-force-primary header
    // Retry logic still handles connection errors/timeouts
    const result = await withRetryOnPrimary(db, async (dbInstance) =>
      getUserById(dbInstance, session.user.id),
    );

    if (!result) {
      return undefined;
    }

    return {
      ...result,
      fileKey: result.teamId ? await generateFileKey(result.teamId) : null,
    };
  }),

  update: protectedProcedure
    .input(updateUserSchema)
    .mutation(async ({ ctx: { db, session }, input }) => {
      if (input.fullName) {
        const current = await getUserById(db, session.user.id);
        if (current?.fullName !== input.fullName) await renameManagedIdentity(session.user.id, input.fullName);
      }
      return updateUser(db, {
        id: session.user.id,
        ...input,
      });
    }),

  switchTeam: protectedProcedure
    .input(z.object({ teamId: z.string().uuid() }))
    .mutation(async ({ ctx: { db, session }, input }) => {
      let result: Awaited<ReturnType<typeof switchUserTeam>>;

      try {
        result = await switchUserTeam(db, {
          userId: session.user.id,
          teamId: input.teamId,
        });
      } catch {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not a member of this team",
        });
      }

      try {
        await Promise.all([
          teamCache.invalidateForUser(session.user.id, result.previousTeamId),
          teamCache.invalidateForUser(session.user.id, input.teamId),
        ]);
      } catch {
        // Non-fatal — cache will expire naturally
      }

      return result;
    }),

  delete: protectedProcedure.mutation(async ({ ctx: { db, session } }) => {
    const plan = await getUserDeletionPlan(db, session.user.id);
    if (plan.needsOwnershipTransfer) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Transfer ownership of shared workspaces before deleting your account." });
    for (const teamId of plan.soloTeamIds) await disconnectTeamServices(db, teamId);
    await disconnectPersonalApps(plan.sharedTeamIds, session.user.id);
    await deleteManagedIdentity(session.user.id);
    const supabaseAdmin = await createAdminClient();

    const [data] = await Promise.all([
      deleteUser(db, session.user.id),
      supabaseAdmin.auth.admin.deleteUser(session.user.id),
    ]);

    return data;
  }),

  invites: protectedProcedure.query(async ({ ctx: { db, session } }) => {
    if (!session.user.email || !await hasVerifiedEmail(session.user.id, session.user.email)) {
      return [];
    }

    return getUserInvites(db, session.user.email);
  }),
});
