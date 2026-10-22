import type { Session } from "@api/utils/auth";
import type { Scope } from "@api/utils/scopes";
import type { Database } from "@business-operations/db/client";
import type { getUserById } from "@business-operations/db/queries";

export type User = NonNullable<Awaited<ReturnType<typeof getUserById>>>;

export type Context = {
  Variables: {
    db: Database;
    session: Session;
    teamId: string;
    clientIp?: string;
    scopes?: Scope[];
    user?: User;
  };
};
