import type { Database } from "@business-operations/db/client";
import { getBankConnections, getInboxAccounts, getTeamMembersByTeamId } from "@business-operations/db/queries";
import { BankFeeds } from "@business-operations/banking/feeds";
import { Mailboxes } from "@business-operations/inbox/mailboxes";
import { getQueue } from "@business-operations/job-client";
import { ConnectedApps } from "@business-operations/storage/connected-apps";
import { PramaanError, unavailableMessage } from "@business-operations/pramaan";
import { TRPCError } from "@trpc/server";

export async function disconnectTeamServices(db: Database, teamId: string) {
  try {
    const bankConnections = await getBankConnections(db, { teamId });
    const feeds = new BankFeeds();
    // Confirm revocation before deleting the records needed to end the rental.
    for (const connection of bankConnections) {
      if (connection.provider !== "pramaan" || !connection.referenceId || !connection.enrollmentId) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Disconnect existing bank connections before deleting this team." });
      }
      await feeds.revoke(`${teamId}:${connection.enrollmentId}`, connection.referenceId);
      await getQueue("bank-feeds").removeJobScheduler(`bank-${teamId}-${connection.referenceId}`);
    }

    await feeds.revokeTeam(teamId);

    const mailboxRecords = await getInboxAccounts(db, teamId);
    for (const mailbox of mailboxRecords) {
      if (mailbox.provider !== "pramaan") throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Disconnect existing mailboxes before deleting this team." });
      await new Mailboxes().disconnect(`team.${teamId}`, mailbox.email);
      await getQueue("inbox-provider").removeJobScheduler(`inbox-sync-${mailbox.id}`);
    }
    const apps = new ConnectedApps();
    for (const member of await getTeamMembersByTeamId(db, teamId)) {
      if (member.user?.id) await apps.disconnectAll(`${teamId}.${member.user.id}`);
    }
  } catch (error) {
    if (error instanceof PramaanError) throw new TRPCError({ code: "PRECONDITION_FAILED", message: unavailableMessage(error) });
    throw error;
  }
}

export async function disconnectPersonalApps(teamIds: string[], userId: string) {
  if (!teamIds.length) return;
  try {
    const apps = new ConnectedApps();
    for (const teamId of teamIds) await apps.disconnectAll(`${teamId}.${userId}`);
  } catch (error) {
    if (error instanceof PramaanError) throw new TRPCError({ code: "PRECONDITION_FAILED", message: unavailableMessage(error) });
    throw error;
  }
}
