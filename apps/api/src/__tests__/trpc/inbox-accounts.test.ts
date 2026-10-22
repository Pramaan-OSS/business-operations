import { beforeEach, describe, expect, test } from "bun:test";
import { createCallerFactory } from "../../trpc/init";
import { inboxAccountsRouter } from "../../trpc/routers/inbox-accounts";
import { createTestContext } from "../helpers/test-context";
import { mocks } from "../setup";

const ACCOUNT_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

const createCaller = createCallerFactory(inboxAccountsRouter);

describe("tRPC: inboxAccounts.get", () => {
  beforeEach(() => {
    mocks.getInboxAccounts.mockReset();
    mocks.getInboxAccounts.mockImplementation(() => Promise.resolve([]));
  });

  test("returns inbox accounts for the team", async () => {
    const caller = createCaller(createTestContext());
    const result = await caller.get();

    expect(result).toEqual([]);
    expect(mocks.getInboxAccounts).toHaveBeenCalledWith(
      expect.anything(),
      "test-team-id",
    );
  });

  test("propagates when getInboxAccounts fails", async () => {
    mocks.getInboxAccounts.mockImplementation(() =>
      Promise.reject(new Error("database unavailable")),
    );

    const caller = createCaller(createTestContext());

    await expect(caller.get()).rejects.toThrow("database unavailable");
  });
});

describe("tRPC: inboxAccounts.delete", () => {
  beforeEach(() => {
    mocks.getInboxAccountById.mockReset();
    mocks.getInboxAccountById.mockImplementation(() => ({ id: ACCOUNT_ID, provider: "pramaan", email: "receipts@example.test" }));
    mocks.mailboxDisconnect.mockReset();
    mocks.mailboxDisconnect.mockImplementation(async () => undefined);
    mocks.deleteInboxAccount.mockReset();
    mocks.deleteInboxAccount.mockImplementation(() =>
      Promise.resolve({ id: ACCOUNT_ID, scheduleId: null }),
    );
  });

  test("returns the deleted row id", async () => {
    const caller = createCaller(createTestContext());
    const result = await caller.delete({ id: ACCOUNT_ID });

    expect(result).toEqual({ id: ACCOUNT_ID, scheduleId: null });
    expect(mocks.mailboxDisconnect).toHaveBeenCalledWith("team.test-team-id", "receipts@example.test");
    expect(mocks.deleteInboxAccount).toHaveBeenCalledWith(expect.anything(), {
      id: ACCOUNT_ID,
      teamId: "test-team-id",
    });
  });

  test("returns null when nothing was deleted", async () => {
    mocks.getInboxAccountById.mockImplementation(() => null);
    mocks.deleteInboxAccount.mockImplementation(() => Promise.resolve(null));

    const caller = createCaller(createTestContext());
    expect(await caller.delete({ id: ACCOUNT_ID })).toBeNull();
  });
  test("keeps the local record when disconnection is uncertain", async () => {
    mocks.mailboxDisconnect.mockImplementation(async () => { throw new Error("Timeout"); });
    await expect(createCaller(createTestContext()).delete({ id: ACCOUNT_ID })).rejects.toThrow();
    expect(mocks.deleteInboxAccount).not.toHaveBeenCalled();
  });

});
