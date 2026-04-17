export const maxDuration = 60;

import crypto from "crypto";
import { fetchMutation } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import {
  authenticateAndCheckRateLimit,
  parseJsonBody,
  validateCommonFields,
  reserveCreditsOrError,
  refundAndFail,
} from "../_shared";
import { validateVideoField } from "@/lib/validation";
import { ReleaseResult, VideoField, FormatEntry, calculateCredits } from "@/lib/types";

export async function POST(request: Request) {
  const authResult = await authenticateAndCheckRateLimit(request);
  if (authResult instanceof Response) return authResult;
  const { userId } = authResult;

  const parsed = await parseJsonBody(request);
  if (parsed instanceof Response) return parsed;
  const body = parsed;

  const commonError = await validateCommonFields(body, userId);
  if (commonError) return commonError;

  // Normalize body.video for validation + downstream consumption.
  // /cook/video treats absence, `true`, and {} as "use defaults".
  // Any other primitive (string/number/false) is a client error.
  const rawVideo = body.video;
  const isObjectVideo = typeof rawVideo === "object" && rawVideo !== null && !Array.isArray(rawVideo);
  if (rawVideo !== undefined && rawVideo !== true && !isObjectVideo) {
    return Response.json(
      { error: "video must be true or { duration: number }" },
      { status: 400 }
    );
  }

  const formats = body.formats as FormatEntry[];
  const maxSlides = Math.max(0, ...formats.map((f) => f.slides?.length ?? 0));
  const videoError = validateVideoField(rawVideo, maxSlides);
  if (videoError) {
    return Response.json({ error: videoError }, { status: 400 });
  }

  // After validation, rawVideo is known to be undefined | true | VideoField-shaped object.
  const video: VideoField = rawVideo === undefined || rawVideo === true
    ? true
    : (rawVideo as VideoField);

  const creditsNeeded = calculateCredits({ video, formats });

  const reserveResult = await reserveCreditsOrError(userId, creditsNeeded);
  if (reserveResult instanceof Response) return reserveResult;
  const { remaining } = reserveResult;

  try {
    const cookId = `cook_${crypto.randomUUID().slice(0, 10)}`;
    const metadata = typeof body.metadata === "string" ? body.metadata : undefined;
    const webhookUrl = typeof body.webhook_url === "string" ? body.webhook_url : undefined;
    const template = typeof body.template === "string" ? body.template : "standard-browser";

    const result: ReleaseResult = {
      cook_id: cookId,
      output: "video",
      status: "pending",
      images: null,
      videos: null,
      credits_used: creditsNeeded,
      credits_remaining: remaining,
      created_at: new Date().toISOString(),
      metadata,
      webhook_url: webhookUrl,
    };

    await fetchMutation(api.releases.create, {
      userId,
      externalId: cookId,
      template,
      credits_used: creditsNeeded,
      output: "video",
      metadata,
      webhook_url: webhookUrl,
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
    console.error("Failed to create video release:", err);
    return refundAndFail(userId, creditsNeeded, "video scheduleRender");
  }
}
