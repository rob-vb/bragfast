import { NextResponse } from "next/server";
import { fetchMutation } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { deleteByPrefix } from "@/lib/storage/r2";

export async function DELETE() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
