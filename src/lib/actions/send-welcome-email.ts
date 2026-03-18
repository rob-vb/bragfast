"use server";

import { getSessionUser } from "@/lib/auth/get-session-user";
import { sendWelcomeEmail } from "@/lib/email";

export async function sendWelcomeEmailAction(): Promise<void> {
  const user = await getSessionUser();
  if (!user) return;

  try {
    await sendWelcomeEmail(user.email, user.name ?? "there");
  } catch (err) {
    console.error("Failed to send welcome email:", err);
  }
}
