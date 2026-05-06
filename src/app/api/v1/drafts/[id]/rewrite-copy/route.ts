import { z } from "zod";
import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { rewriteCopyForClass } from "@/lib/drafts/compose-copy";

export const maxDuration = 60;

const BodySchema = z.object({
  class: z.enum([
    "x",
    "linkedin",
    "instagram",
    "tiktok",
    "threads",
    "facebook",
    "youtube",
  ]),
  title: z.string().min(1),
  description: z.string().min(1),
});

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid body", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  // Ownership check: rewrite consumes Haiku tokens, so confirm the caller
  // actually owns the Draft before invoking the helper. getByExternalId
  // returns null when the row doesn't exist or belongs to a different user.
  const draft = await fetchQuery(api.drafts.getByExternalId, {
    externalId: id,
    userId: user._id,
  });
  if (!draft) {
    return Response.json({ error: "Draft not found" }, { status: 404 });
  }

  const result = await rewriteCopyForClass({
    channelClass: parsed.data.class,
    seedTitle: parsed.data.title,
    seedDescription: parsed.data.description,
  });

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 502 });
  }

  return Response.json({
    title: result.title,
    description: result.description,
  });
}
