import { emailSender } from "@business-operations/pramaan";
import { InviteEmail } from "@business-operations/email/emails/invite";
import { getI18n } from "@business-operations/email/locales";
import { render } from "@business-operations/email/render";
import { inviteTeamMembersSchema, type InviteTeamMembersPayload } from "@business-operations/jobs/schema";
import { sendEmail } from "@business-operations/utils/send-email";
import { createHash } from "node:crypto";
import type { Job } from "bullmq";
import { BaseProcessor } from "../base";
export class InviteMembersProcessor extends BaseProcessor<InviteTeamMembersPayload> {
  protected override getPayloadSchema() { return inviteTeamMembersSchema; }
  async process(job: Job<InviteTeamMembersPayload>) {
    const { invites, ip, locale } = job.data;
    const { t } = getI18n({ locale });
    let sent = 0;
    for (const invite of invites) {
      await sendEmail({ from: emailSender(), replyTo: invite.invitedByEmail, to: invite.email,
        subject: t("invite.subject", { invitedByName: invite.invitedByName, teamName: invite.teamName }),
        html: await render(InviteEmail({ ...invite, ip, locale })),
        idempotencyKey: createHash("sha256").update(`${job.id}:${invite.email}`).digest("hex"),
      });
      sent++;
    }
    return { sent };
  }
}
