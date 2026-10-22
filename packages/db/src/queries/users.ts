import { and, eq, inArray, sql } from "drizzle-orm";
import type { Database, DatabaseOrTransaction } from "../client";
import { teams, users, usersOnTeam } from "../schema";

export const getUserById = async (db: Database, id: string) => {
  const [result] = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      avatarUrl: users.avatarUrl,
      locale: users.locale,
      timeFormat: users.timeFormat,
      dateFormat: users.dateFormat,
      weekStartsOnMonday: users.weekStartsOnMonday,
      timezone: users.timezone,
      timezoneAutoSync: users.timezoneAutoSync,
      teamId: users.teamId,
      team: {
        id: teams.id,
        name: teams.name,
        logoUrl: teams.logoUrl,
        email: teams.email,
        plan: teams.plan,
        subscriptionStatus: teams.subscriptionStatus,
        inboxId: teams.inboxId,
        createdAt: teams.createdAt,
        countryCode: teams.countryCode,
        canceledAt: teams.canceledAt,
        baseCurrency: teams.baseCurrency,
      },
    })
    .from(users)
    .leftJoin(teams, eq(users.teamId, teams.id))
    .where(eq(users.id, id));

  return result;
};

export type UpdateUserParams = {
  id: string;
  fullName?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  locale?: string | null;
  timeFormat?: number | null;
  dateFormat?: string | null;
  weekStartsOnMonday?: boolean | null;
  timezone?: string | null;
  timezoneAutoSync?: boolean | null;
};

export const updateUser = async (db: Database, data: UpdateUserParams) => {
  const { id, ...updateData } = data;

  const [result] = await db
    .update(users)
    .set(updateData)
    .where(eq(users.id, id))
    .returning({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      avatarUrl: users.avatarUrl,
      locale: users.locale,
      timeFormat: users.timeFormat,
      dateFormat: users.dateFormat,
      weekStartsOnMonday: users.weekStartsOnMonday,
      timezone: users.timezone,
      timezoneAutoSync: users.timezoneAutoSync,
      teamId: users.teamId,
    });

  return result;
};

/**
 * Switch a user's active team. Validates membership in usersOnTeam
 * to prevent unauthorized team access.
 */
export const switchUserTeam = async (
  db: Database,
  params: { userId: string; teamId: string },
) => {
  const { userId, teamId } = params;

  // Get the user's current teamId so we can invalidate its cache entry
  const currentUser = await db.query.users.findFirst({
    columns: { teamId: true },
    where: eq(users.id, userId),
  });

  // Verify the user is a member of the target team
  const [membership] = await db
    .select({ id: usersOnTeam.id })
    .from(usersOnTeam)
    .where(and(eq(usersOnTeam.userId, userId), eq(usersOnTeam.teamId, teamId)))
    .limit(1);

  if (!membership) {
    throw new Error("User is not a member of the target team");
  }

  const [result] = await db
    .update(users)
    .set({ teamId })
    .where(eq(users.id, userId))
    .returning({
      id: users.id,
      teamId: users.teamId,
    });

  return { ...result, previousTeamId: currentUser?.teamId ?? null };
};

export const getUserTeamId = async (db: Database, userId: string) => {
  const result = await db.query.users.findFirst({
    columns: { teamId: true },
    where: eq(users.id, userId),
  });

  return result?.teamId || null;
};

export async function getUserDeletionPlan(db: DatabaseOrTransaction, id: string) {
  const memberships = await db.select().from(usersOnTeam).where(eq(usersOnTeam.userId, id));
  if (!memberships.length) return { soloTeamIds: [], sharedTeamIds: [], needsOwnershipTransfer: false };
  const members = await db.select().from(usersOnTeam).where(inArray(usersOnTeam.teamId, memberships.map(row => row.teamId)));
  const soloTeamIds: string[] = [];
  const sharedTeamIds: string[] = [];
  let needsOwnershipTransfer = false;
  for (const membership of memberships) {
    const workspaceMembers = members.filter(row => row.teamId === membership.teamId);
    if (workspaceMembers.length === 1) soloTeamIds.push(membership.teamId);
    else {
      sharedTeamIds.push(membership.teamId);
      if (membership.role === "owner" && !workspaceMembers.some(row => row.userId !== id && row.role === "owner")) needsOwnershipTransfer = true;
    }
  }
  return { soloTeamIds, sharedTeamIds, needsOwnershipTransfer };
}

export const deleteUser = async (db: Database, id: string) => {
  return db.transaction(async tx => {
    const plan = await getUserDeletionPlan(tx, id);
    if (plan.needsOwnershipTransfer) throw new Error("Transfer ownership of shared workspaces before deleting your account.");
    if (plan.soloTeamIds.length) await tx.delete(teams).where(inArray(teams.id, plan.soloTeamIds));
    await tx.delete(users).where(eq(users.id, id));
    return { id };
  });
};
