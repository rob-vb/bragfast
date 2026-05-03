import { Resend } from "resend";
import { render } from "@react-email/render";
import { ResetPasswordEmail } from "./emails/reset-password";
import { GoalHitEmail } from "./emails/goal-hit";

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

