"use server";

import { fetchAction } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { getSessionUser } from "@/lib/auth/get-session-user";

export async function createPortalSession() {
  const user = await getSessionUser();
  if (!user) throw new Error("Not authenticated");

  const { url } = await fetchAction(api.stripe.createPortalSession, {
    userId: user._id,
  });

  return url;
}
