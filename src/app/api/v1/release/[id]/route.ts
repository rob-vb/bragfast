import { validateApiKey } from "@/lib/auth/validate-api-key";
import { getRelease } from "@/lib/pipeline/render";
import { fetchQuery } from "convex/nextjs";
import { api } from "../../../../../convex/_generated/api";
import { NextRequest } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await validateApiKey(request);
  if (!auth) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Ownership check via Convex (returns 404 to avoid leaking existence)
  const release = await fetchQuery(api.releases.getByExternalId, {
    externalId: id,
  });
  if (!release || release.userId !== auth.userId) {
    return Response.json({ error: "Release not found" }, { status: 404 });
  }

  const result = await getRelease(id);
  if (!result) {
    return Response.json({ error: "Release not found" }, { status: 404 });
  }

  // Fill in credits_remaining
  const balance = await fetchQuery(api.userProfiles.getBalance, {
    userId: auth.userId,
  });
  result.credits_remaining = balance;

  return Response.json(result);
}
