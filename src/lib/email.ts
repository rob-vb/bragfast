import { Resend } from "resend";
import { render } from "@react-email/render";
import { WelcomeEmail } from "./emails/welcome";
import { ResetPasswordEmail } from "./emails/reset-password";

const resend = new Resend(process.env.RESEND_API_KEY);
const from = process.env.RESEND_FROM_EMAIL ?? "noreply@brag.fast";

export async function sendWelcomeEmail(
  to: string,
  name: string,
): Promise<void> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const html = await render(WelcomeEmail({ name, dashboardUrl: `${siteUrl}/dashboard` }));

  await resend.emails.send({
    from,
    to,
    subject: "Welcome to brag.fast!",
    html,
  });
}

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
