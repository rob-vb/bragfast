import { NextResponse } from "next/server";
import { fetchAction, fetchMutation } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { deleteByPrefix } from "@/lib/storage/r2";

export async function DELETE() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Cancel any active Stripe subscriptions before deleting data
  await fetchAction(api.stripe.cancelAllSubscriptions, {
    userId: user._id,
  });

  // Delete all user data from Convex
  const { releaseIds } = await fetchMutation(api.account.deleteAccount, {
    userId: user._id,
  });

  // Purge R2 images for all releases
  for (const releaseId of releaseIds) {
    await deleteByPrefix(`releases/${releaseId}/`);
  }

  return NextResponse.json({ deleted: true });
}
