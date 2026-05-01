import { Resend } from "resend";
import { render } from "@react-email/render";
import { ResetPasswordEmail } from "./emails/reset-password";
import { GoalHitEmail } from "./emails/goal-hit";
import {
  WeeklyDigestEmail,
  type WeeklyDigestEmailProps,
} from "./emails/weekly-digest";

const resend = new Resend(process.env.RESEND_API_KEY);
const from = process.env.RESEND_FROM_EMAIL ?? "noreply@brag.fast";

export async function sendResetPasswordEmail(
  to: string,
  resetUrl: string,
): Promise<void> {
  const html = await render(ResetPasswordEmail({ resetUrl }));

  await resend.emails.send({
    from,
    to,
    subject: "Reset your password",
    html,
  });
}

// S5.5: celebration email fired by Convex internalAction goalEmails.sendCelebrationEmail
// when a goal's firstHitAt is set. approveUrl deep-links to /admin/drafts so the user
// can one-click approve the auto-drafted brag post.
export async function sendGoalHitEmail(
  to: string,
  goalLabel: string,
  approveUrl: string,
): Promise<void> {
  const html = await render(GoalHitEmail({ goalLabel, approveUrl }));

  await resend.emails.send({
    from,
    to,
    subject: `You hit ${goalLabel} — brag.fast drafted the post`,
    html,
  });
}

// S9.1: weekly digest email fired by Convex internalAction
// digestEmails.sendWeeklyDigest. Skipped server-side when approved=0 so this
// fn assumes approved >= 1.
export async function sendWeeklyDigestEmail(
  to: string,
  data: WeeklyDigestEmailProps,
): Promise<void> {
  const html = await render(WeeklyDigestEmail(data));
  const subject = `Your brag.fast week: ${data.approved} brag${data.approved === 1 ? "" : "s"} shipped`;

  await resend.emails.send({
    from,
    to,
    subject,
    html,
  });
}
