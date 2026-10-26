import { expect, test } from "bun:test";
import { mkdir, mkdtemp } from "node:fs/promises";
import path from "node:path";
import { FakePramaan } from "@business-operations/pramaan/fake";
import { ConnectedApps } from "./connected-apps";

test("catalogue drives accounting and chat coverage; owned actions require stored approval", async () => {
  const scratch = path.resolve(__dirname, "../../../.scratch");
  await mkdir(scratch, { recursive: true });
  const previous = process.env.STORAGE_ROOT;
  process.env.STORAGE_ROOT = await mkdtemp(`${scratch}/apps-`);
  // Catalogue fixtures describe required coverage; they do not claim live availability.
  const apps = ["xero", "quickbooks", "fortnox"];
  const actions = apps.flatMap(app => [
    { app, action: `${app.toUpperCase()}_LIST_ACCOUNTS`, readOnly: true as const },
    { app, action: `${app.toUpperCase()}_CREATE_TRANSACTION` },
    { app, action: `${app.toUpperCase()}_CREATE_INVOICE` },
  ]);
  const fake = new FakePramaan({
    "apps.catalog.search": input => { const request = input as { app?: string }; return { results: actions.filter(row => !request.app || row.app === request.app) }; },
    "apps.connections.list": input => ({ results: (input as { endUserRef: string }).endUserRef === "team.person" ? apps.map(app => ({ app, status: "active", access: "read-write" })) : [] }),
    "apps.connection.start": () => ({ connectUrl: "https://example.test/connect" }),
    "apps.action.execute": () => ({ status: "succeeded", output: { created: true } }),
    "apps.connection.revoke": () => ({ revoked: 1 }),
  });
  const client = new ConnectedApps(fake);
  try {
    for (const app of apps) expect(await client.catalog("accounting", app)).toHaveLength(3);
    expect(await client.catalog("read messages", "slack")).toEqual([]);
    await expect(client.start("team.person", "xero", "https://example.test/return", false)).rejects.toThrow("broad access");
    await expect(client.read("other.person", "xero", "XERO_LIST_ACCOUNTS", {})).rejects.toThrow("Connect");
    await expect(client.read("team.person", "xero", "XERO_CREATE_INVOICE", {})).rejects.toThrow("approve");
    const review = await client.review("team.person", "xero", "XERO_CREATE_INVOICE", { total: 120 });
    expect(fake.callsTo("apps.action.execute")).toHaveLength(0);
    await expect(client.approve("other.person", review.id, true)).rejects.toThrow("not found");
    expect((await client.approve("team.person", review.id, true)).status).toBe("succeeded");
    expect((await client.approve("team.person", review.id, true)).status).toBe("succeeded");
    expect(fake.callsTo("apps.action.execute")).toEqual([{ endUserRef: "team.person", action: "XERO_CREATE_INVOICE", input: { total: 120 } }]);
    fake.route({ "apps.action.execute": () => { throw new Error("timeout"); } });
    const uncertain = await client.review("team.person", "xero", "XERO_CREATE_TRANSACTION", {});
    expect((await client.approve("team.person", uncertain.id, true)).status).toBe("unknown");
    await client.approve("team.person", uncertain.id, true);
    expect(fake.callsTo("apps.action.execute")).toHaveLength(2);
  } finally { if (previous === undefined) delete process.env.STORAGE_ROOT; else process.env.STORAGE_ROOT = previous; }
});

test("workspace removal confirms revocation and refuses incomplete or uncertain connection lists", async () => {
  let connected = true;
  const fake = new FakePramaan({
    "apps.connections.list": () => ({ results: connected ? [{ app: "ledger", status: "active" }] : [] }),
    "apps.connection.revoke": () => { connected = false; return { revoked: 1 }; },
  });
  const client = new ConnectedApps(fake);
  await client.disconnectAll("workspace.person");
  expect(fake.callsTo("apps.connection.revoke")).toHaveLength(1);
  await client.disconnectAll("workspace.person");
  expect(fake.callsTo("apps.connection.revoke")).toHaveLength(1);
  connected = true;
  fake.route({ "apps.connections.list": () => ({ results: Array.from({ length: 100 }, (_, i) => ({ app: `ledger_${i}`, status: "active" })) }) });
  await expect(client.disconnectAll("workspace.person")).rejects.toThrow("incomplete");
  expect(fake.callsTo("apps.connection.revoke")).toHaveLength(1);
  fake.route({ "apps.connections.list": () => ({ results: [{ app: "ledger", status: "active" }], nextCursor: "next-page" }) });
  await expect(client.disconnectAll("workspace.person")).rejects.toThrow("incomplete");
  expect(fake.callsTo("apps.connection.revoke")).toHaveLength(1);
  fake.route({ "apps.connections.list": () => ({ results: [{ app: "ledger", status: "active" }] }), "apps.connection.revoke": () => ({ revoked: 1 }) });
  await expect(client.disconnectAll("workspace.person")).rejects.toThrow("could not be confirmed");
  fake.route({ "apps.connection.revoke": () => ({ revoked: "1" }) });
  await expect(client.disconnectAll("workspace.person")).rejects.toThrow("could not be confirmed");
});

test("connection creation does not depend on matching an action description", async () => {
 const p = new FakePramaan({
  "apps.catalog.search": input => { return { results: [] }; },
  "apps.connection.start": () => ({ connectUrl: "https://example.test/consent" }),
 });
 const result = await new ConnectedApps(p).start("team.person", "gmail", "http://localhost:3011/apps", true);
 expect(result.connectUrl).toBe("https://example.test/consent");
 expect(p.callsTo("apps.connection.start")).toHaveLength(1);
 expect(p.calls.find(call => call.id === "apps.connection.start")?.opts?.idempotencyKey).toBeTruthy();
});

test("message reads require the owned connection and a catalogue read action", async () => {
 const fake = new FakePramaan({
  "apps.connections.list": input => ({ results: (input as {endUserRef:string}).endUserRef === "team.user" ? [{ app: "slack", status: "active" }] : [] }),
  "apps.catalog.search": () => ({ results: [{ app: "slack", action: "SLACK_FETCH_CONVERSATION_HISTORY", readOnly: true }, { app: "slack", action: "SLACK_SEND_MESSAGE" }] }),
  "apps.action.read": () => ({ messages: [], nextCursor: "next" }),
 });
 const apps = new ConnectedApps(fake);
 await expect(apps.readMessages("other.user", "slack", "SLACK_FETCH_CONVERSATION_HISTORY", {})).rejects.toThrow("Connect");
 await expect(apps.readMessages("team.user", "slack", "SLACK_SEND_MESSAGE", {})).rejects.toThrow("read action");
 expect(await apps.readMessages("team.user", "slack", "SLACK_FETCH_CONVERSATION_HISTORY", {channel:"room"}, "previous")).toEqual({messages:[],nextCursor:"next"});
 expect(fake.callsTo("apps.action.read")).toEqual([{endUserRef:"team.user",action:"SLACK_FETCH_CONVERSATION_HISTORY",input:{channel:"room"},since:"previous",limit:50}]);
 expect(fake.callsTo("apps.action.execute")).toEqual([]);
});
