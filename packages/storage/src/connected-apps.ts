import { randomUUID } from "node:crypto";
import { requirePramaan, unavailableMessage, type Pramaan, type JsonObject } from "@business-operations/pramaan";
import { getObject, putObject } from "./index";

export const APP_ACCESS_NOTICE = "Connecting can grant broad access to your account. Review the permissions before authorising. Changes and sends need your separate approval.";
type Review = { id: string; owner: string; app: string; action: string; input: JsonObject; expiresAt: number; status: "review" | "starting" | "succeeded" | "failed" | "unknown"; output?: unknown; message?: string };
function key(owner: string, id: string) {
  if (!/^[A-Za-z0-9_.-]{1,128}$/.test(owner) || !/^[a-f0-9-]{36}$/.test(id)) throw new Error("Request not found.");
  return `${owner}/${id}.json`;
}
async function save(review: Review) { await putObject({ bucket: "app-reviews", path: key(review.owner, review.id), data: JSON.stringify(review) }); }
async function load(owner: string, id: string) {
  const file = await getObject({ bucket: "app-reviews", path: key(owner, id) });
  if (!file) throw new Error("Request not found.");
  const review = JSON.parse(file.data.toString()) as Review;
  if (review.owner !== owner || review.id !== id) throw new Error("Request not found.");
  return review;
}
export class ConnectedApps {
  constructor(private readonly p: Pramaan = requirePramaan()) {}
  async catalog(query = "business accounting invoices payments messages", app?: string) {
    const results = [];
    let cursor: string | undefined;
    for (let page = 0; page < 100; page++) {
      const result = await this.p.appsCatalogSearch({ query, app, cursor, limit: 50 });
      results.push(...result.results);
      if (!result.nextCursor) return results;
      if (result.nextCursor === cursor) throw new Error("The app catalogue is incomplete.");
      cursor = result.nextCursor;
    }
    throw new Error("The app catalogue is incomplete.");
  }
  connections(owner: string) { return this.p.appsConnectionsList({ endUserRef: owner }); }
  async start(owner: string, app: string, redirectUrl: string, approved: boolean) {
    if (!approved) throw new Error(APP_ACCESS_NOTICE);
    return this.p.appsConnectionStart({ app, endUserRef: owner, redirectUrl }, { idempotencyKey: randomUUID() });
  }
  async disconnect(owner: string, app: string) {
    if (!(await this.connections(owner)).results.some(row => row.app === app)) throw new Error("Connected account not found.");
    return this.p.appsConnectionRevoke({ endUserRef: owner, app }, { idempotencyKey: `revoke-${owner}-${app}` });
  }
  async disconnectAll(owner: string) {
    const listed = await this.connections(owner);
    if (listed.nextCursor || listed.results.length >= 100) throw new Error("Disconnect all connected accounts before deleting this workspace; the account list is incomplete.");
    for (const app of new Set(listed.results.filter(row => row.status !== "revoked").map(row => row.app))) await this.disconnect(owner, app);
    const remaining = await this.connections(owner);
    if (remaining.nextCursor || remaining.results.length >= 100 || remaining.results.some(row => row.status !== "revoked")) throw new Error("Connected account revocation could not be confirmed. Check the accounts before trying deletion again.");
  }
  private async ownedAction(owner: string, app: string, action: string) {
    const connections = await this.connections(owner);
    const connection = connections.results.find(row => row.app === app && row.status === "active");
    if (!connection) throw new Error("Connect this account first.");
    const entry = (await this.catalog(action, app)).find(row => row.app === app && row.action === action);
    if (!entry) throw new Error("This feature is not available yet.");
    return { entry, connection };
  }
  async read(owner: string, app: string, action: string, input: JsonObject) {
    const { entry } = await this.ownedAction(owner, app, action);
    if (entry.readOnly !== true) throw new Error("Review and approve this change first.");
    return this.p.appsActionExecute({ endUserRef: owner, action, input }, { idempotencyKey: randomUUID() });
  }
  async review(owner: string, app: string, action: string, input: JsonObject) {
    await this.ownedAction(owner, app, action);
    const review: Review = { id: randomUUID(), owner, app, action, input, expiresAt: Date.now() + 14 * 60000, status: "review" };
    await save(review);
    return review;
  }
  async approve(owner: string, id: string, approved: boolean) {
    const review = await load(owner, id);
    if (!approved) throw new Error("Approve this request before it can run.");
    if (review.status !== "review") return review;
    if (review.expiresAt <= Date.now()) throw new Error("This review expired. Review the request again.");
    await this.ownedAction(owner, review.app, review.action);
    review.status = "starting"; await save(review);
    try {
      const result = await this.p.appsActionExecute({ endUserRef: owner, action: review.action, input: review.input }, { idempotencyKey: review.id });
      review.status = result.status;
      review.output = result.output;
      if (result.status === "failed") review.message = "The action did not finish. Check the connected account before trying again.";
    } catch (error) { review.status = "unknown"; review.message = unavailableMessage(error); }
    await save(review);
    return review;
  }
  status(owner: string, id: string) { return load(owner, id); }
}
