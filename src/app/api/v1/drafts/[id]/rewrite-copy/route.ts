import { z } from "zod";
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
  _ctx: { params: Promise<{ id: string }> }, // eslint-disable-line @typescript-eslint/no-unused-vars
) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

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
