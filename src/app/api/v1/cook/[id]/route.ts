import { authenticate } from "@/lib/auth/authenticate";
import { getRelease } from "@/lib/pipeline/render";
import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { NextRequest } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticate(request);
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

  return Response.json(result);
}
