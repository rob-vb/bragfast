import { authenticate } from "@/lib/auth/authenticate";
import { fetchMutation, fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { NextRequest } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticate(request);
  if (!auth) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let body: { twitter?: string; linkedin?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.twitter && !body.linkedin) {
    return Response.json(
      { error: "Provide twitter and/or linkedin fields" },
      { status: 400 }
    );
  }

  // Get existing release
  const release = await fetchQuery(api.releases.getByExternalId, {
    externalId: id,
  });
  if (!release || release.userId !== auth.userId) {
    return Response.json({ error: "Release not found" }, { status: 404 });
  }

  // Merge with existing copy
  const existing = release.socialCopy ? JSON.parse(release.socialCopy) : {};
  const updated = {
    twitter: body.twitter ?? existing.twitter ?? "",
    linkedin: body.linkedin ?? existing.linkedin ?? "",
  };

  await fetchMutation(api.releases.updateSocialCopy, {
    externalId: id,
    userId: auth.userId,
    socialCopy: JSON.stringify(updated),
  });

  return Response.json({ socialCopy: updated });
}
