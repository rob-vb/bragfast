"use server";

import { fetchAction } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { getSessionUser } from "@/lib/auth/get-session-user";

export async function createCheckout(planId: string) {
  const user = await getSessionUser();
  if (!user) throw new Error("Not authenticated");

  const { url } = await fetchAction(api.stripe.createCheckoutSession, {
    userId: user._id,
    email: user.email,
    planId,
  });

  return url;
}
