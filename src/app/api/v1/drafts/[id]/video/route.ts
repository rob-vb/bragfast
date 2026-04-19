import { authenticate } from "@/lib/auth/authenticate";
import { fetchQuery, fetchMutation } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { calculateCredits } from "@/lib/types";
import type { FormatEntry, ObjectModification } from "@/lib/types";

export const maxDuration = 60;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticate(request);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // 1. Mint a video release row off the approved draft. Mutation is idempotent
  //    — re-calling returns the existing videoReleaseId instead of charging twice.
  let releaseRef: { releaseId: Id<"releases">; externalId: string };
  try {
    releaseRef = await fetchMutation(api.drafts.promoteDraftToVideo, {
      userId: auth.userId,
      id: id as Id<"drafts">,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "failed";
    const status = msg.includes("Forbidden")
      ? 403
      : msg.includes("not found")
        ? 404
        : msg.includes("approved")
          ? 409
          : 400;
    return Response.json({ error: msg }, { status });
  }

  const draft = await fetchQuery(api.drafts.getById, { id: id as Id<"drafts"> });
  if (!draft) return Response.json({ error: "Draft missing" }, { status: 500 });

  const objects = (draft.aiContent ?? []) as ObjectModification[];
  const formats: FormatEntry[] = [
    { name: draft.suggestedFormat, slides: [{ objects }] },
  ];

  const creditsNeeded = calculateCredits({ video: true, formats });

  try {
    await fetchMutation(api.userProfiles.reserve, {
      userId: auth.userId,
      amount: creditsNeeded,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("Insufficient credits")) {
      return Response.json({ error: "Insufficient credits" }, { status: 402 });
    }
    throw err;
  }

  await fetchMutation(api.releases.approve, {
    externalId: releaseRef.externalId,
    userId: auth.userId,
    credits_used: creditsNeeded,
  });

  // Video renders go through the Convex scheduler (Remotion Lambda) rather
  // than next/after — matches existing /api/github/releases/[id]/approve path.
  await fetchMutation(api.releases.scheduleVideoRender, {
    cookId: releaseRef.externalId,
    userId: auth.userId,
    request: JSON.stringify({
      template: draft.suggestedTemplateId,
      formats,
      colors: { background: "#FFF8F0", text: "#4A3326", primary: "#F8AF3C" },
      video: { preset: "showcase" },
    }),
  });

  return Response.json({ ok: true, cook_id: releaseRef.externalId });
}
