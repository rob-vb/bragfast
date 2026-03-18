import { Resend } from "resend";
import { render } from "@react-email/render";
import { ResetPasswordEmail } from "./emails/reset-password";

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
