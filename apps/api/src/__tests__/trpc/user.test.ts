import { ConnectedApps } from "@business-operations/storage/connected-apps";
import { beforeEach, describe, expect, test } from "bun:test";
import { getUserInvites } from "@business-operations/db/queries";
import { createCallerFactory } from "../../trpc/init";
import { userRouter } from "../../trpc/routers/user";
import { createTestContext } from "../helpers/test-context";
import { asMock, mocks } from "../setup";

if (!process.env.FILE_KEY_SECRET) {
  process.env.FILE_KEY_SECRET = "test-file-key-secret-for-trpc-user-tests";
}

const createCaller = createCallerFactory(userRouter);

describe("tRPC: user.me", () => {
  beforeEach(() => {
    mocks.getUserById.mockReset();
    mocks.getUserById.mockImplementation(() =>
      Promise.resolve({
        id: "test-user-id",
        email: "test@example.com",
        fullName: "Test User",
        teamId: "test-team-id",
        avatarUrl: null,
        locale: null,
        timeFormat: null,
        dateFormat: null,
        weekStartsOnMonday: null,
        timezone: null,
        timezoneAutoSync: null,
        team: null,
      }),
    );
  });

  test("returns current user with team context", async () => {
    const caller = createCaller(createTestContext());
    const result = await caller.me();

    expect(result).toMatchObject({
      id: "test-user-id",
      email: "test@example.com",
      fullName: "Test User",
      teamId: "test-team-id",
    });
    expect(result?.fileKey).toBeTruthy();
  });

  test("loads user by session id", async () => {
    const caller = createCaller(createTestContext());
    await caller.me();

    expect(mocks.getUserById).toHaveBeenCalledWith(
      expect.anything(),
      "test-user-id",
    );
  });

  test("returns undefined when user is not found", async () => {
    mocks.getUserById.mockImplementation(() => Promise.resolve(null));

    const caller = createCaller(createTestContext());
    const result = await caller.me();

    expect(result).toBeUndefined();
  });
});

describe("tRPC: user.update", () => {
  beforeEach(() => {
    mocks.renameManagedIdentity.mockReset();
    mocks.renameManagedIdentity.mockImplementation(async () => {});
    mocks.getUserById.mockImplementation(async () => ({ fullName: "Test User" }));
    mocks.updateUser.mockReset();
    mocks.updateUser.mockImplementation(() =>
      Promise.resolve({
        id: "test-user-id",
        fullName: "New Name",
      }),
    );
  });

  test("onboarding preserves an unchanged name without calling managed profile updates", async () => {
    mocks.renameManagedIdentity.mockImplementation(async () => { throw new Error("Connect an account for this capability first."); });
    await createCaller(createTestContext()).update({ fullName: "Test User" });
    expect(mocks.renameManagedIdentity).not.toHaveBeenCalled();
    expect(mocks.updateUser).toHaveBeenCalled();
  });

  test("updates full name", async () => {
    const caller = createCaller(createTestContext());
    const result = await caller.update({ fullName: "New Name" });

    expect(result).toMatchObject({
      id: "test-user-id",
      fullName: "New Name",
    });
  });

  test("passes session user id to DB query", async () => {
    const caller = createCaller(createTestContext());
    await caller.update({ fullName: "New Name" });

    expect(mocks.updateUser).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        id: "test-user-id",
        fullName: "New Name",
      }),
    );
  });

  test("rejects full name shorter than minimum length", async () => {
    const caller = createCaller(createTestContext());

    await expect(caller.update({ fullName: "N" })).rejects.toThrow();
  });
});

describe("tRPC: user.invites", () => {
  beforeEach(() => {
    mocks.hasVerifiedEmail.mockReset();
    mocks.hasVerifiedEmail.mockImplementation(async () => true);
    asMock(getUserInvites).mockReset();
    asMock(getUserInvites).mockImplementation(() => Promise.resolve([]));
  });

  test("returns invite list", async () => {
    asMock(getUserInvites).mockImplementation(() =>
      Promise.resolve([
        {
          id: "invite-1",
          email: "invitee@example.com",
          status: "pending",
        },
      ]),
    );

    const caller = createCaller(createTestContext());
    const result = await caller.invites();

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: "invite-1" });
  });

  test("queries invites with session email", async () => {
    asMock(getUserInvites).mockImplementation(() => Promise.resolve([]));

    const caller = createCaller(createTestContext());
    await caller.invites();

    expect(getUserInvites).toHaveBeenCalledWith(
      expect.anything(),
      "test@example.com",
    );
  });

  test("does not expose invitations until email ownership is proved", async () => {
    mocks.hasVerifiedEmail.mockImplementation(async () => false);
    const caller = createCaller(createTestContext());
    expect(await caller.invites()).toEqual([]);
    expect(getUserInvites).not.toHaveBeenCalled();
  });

  test("returns empty list when session email is missing", async () => {
    const base = createTestContext();
    const caller = createCaller({
      ...base,
      session: {
        user: {
          id: "test-user-id",
        },
      },
    });

    const result = await caller.invites();

    expect(result).toEqual([]);
    expect(getUserInvites).not.toHaveBeenCalled();
  });
});

const SWITCH_TEAM_ID = "f47ac10b-58cc-4372-a567-0e02b2c3d479";

describe("tRPC: user.switchTeam", () => {
  beforeEach(() => {
    mocks.switchUserTeam.mockReset();
    mocks.switchUserTeam.mockImplementation(() =>
      Promise.resolve({
        id: "test-user-id",
        teamId: SWITCH_TEAM_ID,
        previousTeamId: "test-team-id",
      }),
    );
  });

  test("switches active team and calls switchUserTeam", async () => {
    const caller = createCaller(createTestContext());
    const result = await caller.switchTeam({ teamId: SWITCH_TEAM_ID });

    expect(result).toMatchObject({
      teamId: SWITCH_TEAM_ID,
      previousTeamId: "test-team-id",
    });
    expect(mocks.switchUserTeam).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        userId: "test-user-id",
        teamId: SWITCH_TEAM_ID,
      }),
    );
  });
});

describe("tRPC: user.delete", () => {
  beforeEach(() => {
    mocks.getUserDeletionPlan.mockReset();
    mocks.getUserDeletionPlan.mockImplementation(() => Promise.resolve({ soloTeamIds: [], sharedTeamIds: [], needsOwnershipTransfer: false }));
    mocks.deleteUser.mockReset();
    mocks.deleteUser.mockImplementation(() =>
      Promise.resolve({ id: "test-user-id" }),
    );
    mocks.supabaseAdminDeleteUser.mockReset();
    mocks.supabaseAdminDeleteUser.mockImplementation(() =>
      Promise.resolve({ data: {}, error: null }),
    );
  });

  test("requires ownership transfer before deleting a shared workspace owner", async () => {
    mocks.getUserDeletionPlan.mockImplementation(() => Promise.resolve({ soloTeamIds: [], sharedTeamIds: [], needsOwnershipTransfer: true }));
    await expect(createCaller(createTestContext()).delete()).rejects.toThrow("Transfer ownership");
    expect(mocks.deleteUser).not.toHaveBeenCalled();
    expect(mocks.supabaseAdminDeleteUser).not.toHaveBeenCalled();
  });

  test("disconnects personal app access while preserving shared workspace data", async () => {
    mocks.getUserDeletionPlan.mockImplementation(() => Promise.resolve({ soloTeamIds: [], sharedTeamIds: ["shared-workspace"], needsOwnershipTransfer: false }));
    await createCaller(createTestContext()).delete();
    expect((await new ConnectedApps().connections("shared-workspace.test-user-id")).results).toEqual([]);
    expect(mocks.deleteUser).toHaveBeenCalled();
  });

  test("deletes user and calls deleteUser", async () => {
    const caller = createCaller(createTestContext());
    const result = await caller.delete();

    expect(result).toMatchObject({ id: "test-user-id" });
    expect(mocks.deleteUser).toHaveBeenCalledWith(
      expect.anything(),
      "test-user-id",
    );
    expect(mocks.supabaseAdminDeleteUser).toHaveBeenCalledWith("test-user-id");
  });
});
