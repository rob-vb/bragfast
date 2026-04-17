export const maxDuration = 60;

import crypto from "crypto";
import { fetchMutation } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import {
  authenticateAndCheckRateLimit,
  parseJsonBody,
  validateCommonFields,
  reserveCreditsOrError,
} from "../_shared";
import { validateVideoField } from "@/lib/validation";
import { ReleaseResult, VideoField, calculateCredits } from "@/lib/types";

export async function POST(request: Request) {
  const authResult = await authenticateAndCheckRateLimit(request);
  if (authResult instanceof Response) return authResult;
  const { userId } = authResult;

  const parsed = await parseJsonBody(request);
  if (parsed instanceof Response) return parsed;
  const body = parsed as Record<string, unknown>;

  const commonError = await validateCommonFields(body, userId);
  if (commonError) return commonError;

  // Normalize body.video for validation + downstream consumption.
  // /cook/video treats absence, `true`, and {} as "use defaults".
  // Any other primitive (string/number/false) is a client error.
  const rawVideo = body.video;
  let video: VideoField;
  if (rawVideo === undefined || rawVideo === true) {
    video = true;
  } else if (typeof rawVideo === "object" && rawVideo !== null) {
    video = rawVideo as VideoField;
  } else {
    return Response.json(
      { error: "video must be true or { duration: number }" },
      { status: 400 }
    );
  }

  const formats = body.formats as { slides: unknown[] }[];
  const maxSlides = Math.max(...formats.map((f) => f.slides?.length ?? 0));
  const videoError = validateVideoField(video, maxSlides);
  if (videoError) {
    return Response.json({ error: videoError }, { status: 400 });
  }

  const creditsNeeded = calculateCredits({
    video,
    formats: body.formats as Parameters<typeof calculateCredits>[0]["formats"],
  });

  const reserveResult = await reserveCreditsOrError(userId, creditsNeeded);
  if (reserveResult instanceof Response) return reserveResult;
  const { remaining } = reserveResult;

  try {
    const cookId = `cook_${crypto.randomUUID().slice(0, 10)}`;
    const result: ReleaseResult = {
      cook_id: cookId,
      output: "video",
      status: "pending",
      images: null,
      videos: null,
      credits_used: creditsNeeded,
      credits_remaining: remaining,
      created_at: new Date().toISOString(),
      metadata: body.metadata as string | undefined,
      webhook_url: body.webhook_url as string | undefined,
    };

    await fetchMutation(api.releases.create, {
      userId,
      externalId: cookId,
      template: (body.template as string) || "standard-browser",
      credits_used: creditsNeeded,
      output: "video",
      metadata: body.metadata as string | undefined,
      webhook_url: body.webhook_url as string | undefined,
      source: "api",
    });

    // The Convex action requires a defined `video` field (see VideoRenderRequest
    // in convex/videoRender.ts). Inject the normalized value so downstream code
    // never sees `undefined`.
    const downstreamBody = { ...body, video };

    await fetchMutation(api.releases.scheduleVideoRender, {
      cookId,
      userId,
      request: JSON.stringify(downstreamBody),
    });

    return Response.json(result, { status: 202 });
  } catch (err) {
    await fetchMutation(api.userProfiles.refund, {
      userId,
      amount: creditsNeeded,
    }).catch(console.error);
    console.error("Failed to create video release:", err);
    return Response.json(
      { error: "Something burned. Try again." },
      { status: 500 }
    );
  }
}
