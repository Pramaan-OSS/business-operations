import { expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq, inArray } from "drizzle-orm";
import * as schema from "../schema";
import { withReplicas } from "../replicas";
import { deleteUser, getUserDeletionPlan } from "../queries/users";

test.skipIf(!process.env.BANK_IMPORT_TEST_DATABASE_URL)("account deletion preserves shared workspaces and requires another owner", async () => {
  const pool = new Pool({ connectionString: process.env.BANK_IMPORT_TEST_DATABASE_URL });
  const primary = drizzle(pool, { schema, casing: "snake_case" });
  const db = withReplicas(primary, [primary], replicas => replicas[0]!);
  const userId = randomUUID(), otherUser = randomUUID(), solo = randomUUID(), shared = randomUUID();
  try {
    await db.insert(schema.teams).values([{ id: solo, name: "Solo deletion fixture" }, { id: shared, name: "Shared deletion fixture" }]);
    await db.insert(schema.users).values([{ id: userId, teamId: solo }, { id: otherUser, teamId: shared }]);
    await db.insert(schema.usersOnTeam).values([{ userId, teamId: solo, role: "owner" }, { userId, teamId: shared, role: "owner" }, { userId: otherUser, teamId: shared, role: "member" }]);
    expect(await getUserDeletionPlan(db as any, userId)).toEqual({ soloTeamIds: [solo], sharedTeamIds: [shared], needsOwnershipTransfer: true });
    await expect(deleteUser(db as any, userId)).rejects.toThrow("Transfer ownership");
    expect(await db.select().from(schema.users).where(eq(schema.users.id, userId))).toHaveLength(1);
    await db.update(schema.usersOnTeam).set({ role: "owner" }).where(eq(schema.usersOnTeam.userId, otherUser));
    expect(await getUserDeletionPlan(db as any, userId)).toEqual({ soloTeamIds: [solo], sharedTeamIds: [shared], needsOwnershipTransfer: false });
    await deleteUser(db as any, userId);
    expect(await db.select().from(schema.teams).where(eq(schema.teams.id, solo))).toHaveLength(0);
    expect(await db.select().from(schema.teams).where(eq(schema.teams.id, shared))).toHaveLength(1);
    expect(await db.select().from(schema.usersOnTeam).where(eq(schema.usersOnTeam.teamId, shared))).toHaveLength(1);
    expect(await db.select().from(schema.users).where(eq(schema.users.id, otherUser))).toHaveLength(1);
  } finally {
    await db.delete(schema.teams).where(inArray(schema.teams.id, [solo, shared]));
    await db.delete(schema.users).where(inArray(schema.users.id, [userId, otherUser]));
    await pool.end();
  }
});
