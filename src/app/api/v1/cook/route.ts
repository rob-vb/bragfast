import { after } from "next/server";

export const maxDuration = 60;

import { validateApiKey } from "@/lib/auth/validate-api-key";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { validateReleaseColors, validateFormats, validateVideoField } from "@/lib/validation";
import { createRelease, renderReleaseAsync } from "@/lib/pipeline/render";
import { ReleaseRequest, calculateCredits } from "@/lib/types";
import { fetchMutation, fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";

// Lazy-loaded to avoid pulling Remotion's heavy native deps into every request
const loadVideoModules = () =>
  import("@/lib/pipeline/render-video").then((m) => m);

export async function POST(request: Request) {
  const auth = await validateApiKey(request);
  if (!auth) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimitResponse = await checkRateLimit(auth.userId);
  if (rateLimitResponse) return rateLimitResponse;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const isVideo = !!body.video;

  // ── Shared validation ──────────────────────────────────────────

  const colorError = validateReleaseColors(body as Record<string, unknown>);
  if (colorError) {
    return Response.json({ error: colorError }, { status: 400 });
  }

  if (body.brand_id) {
    const brand = await fetchQuery(api.brands.getByExternalId, {
      externalId: body.brand_id,
    });
    if (!brand || brand.userId !== auth.userId) {
      return Response.json({ error: "Brand not found" }, { status: 404 });
    }
  }

  const formatError = validateFormats(body.formats);
  if (formatError) {
    return Response.json({ error: formatError }, { status: 400 });
  }

  // Video: reject og format
  if (isVideo) {
    for (const format of body.formats) {
      if (format.name === "og") {
        return Response.json(
          { error: 'Video does not support "og" format. Use landscape, square, or portrait.' },
          { status: 400 }
        );
      }
    }
  }

  // Video field validation
  if (isVideo) {
    const maxSlides = Math.max(...body.formats.map((f: { slides: unknown[] }) => f.slides?.length ?? 0));
    const videoError = validateVideoField(body.video, maxSlides);
    if (videoError) {
      return Response.json({ error: videoError }, { status: 400 });
    }
  }

  // Template validation (image and video both use templates now)
  if (body.template) {
    const validDefaults = ["standard-browser", "standard-mobile", "split-browser", "split-mobile", "hero"];
    const isDefault = validDefaults.includes(body.template);
    const isCustom = typeof body.template === "string" && body.template.startsWith("tmpl_");
    if (!isDefault && !isCustom) {
      return Response.json(
        { error: "Invalid template. Must be standard-browser, standard-mobile, split-browser, split-mobile, hero, or a template ID (tmpl_...)" },
        { status: 400 }
      );
    }
  }

  // ── Credit reservation (shared) ────────────────────────────────

  const creditsNeeded = calculateCredits({
    video: isVideo ? body.video : undefined,
    formats: body.formats,
  });

  let remaining: number;
  try {
    remaining = await fetchMutation(api.userProfiles.reserve, {
      userId: auth.userId,
      amount: creditsNeeded,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("Insufficient credits")) {
      return Response.json(
        {
          error: "Your plate is empty. Pick a plan to keep serving.",
          credits_needed: creditsNeeded,
        },
        { status: 429 }
      );
    }
    if (msg.includes("User profile not found")) {
      return Response.json(
        { error: "No user profile found. Create an API key first to initialize your account." },
        { status: 403 }
      );
    }
    throw err;
  }

  // ── Video branch ──────────────────────────────────────────────

  if (isVideo) {
    const { createVideoRelease, renderVideoAsync } = await loadVideoModules();

    try {
      const { cookId, result } = createVideoRelease(creditsNeeded);

      await fetchMutation(api.releases.create, {
        userId: auth.userId,
        externalId: cookId,
        template: body.template || "standard-browser",
        credits_used: creditsNeeded,
        output: "video",
        metadata: body.metadata,
        webhook_url: body.webhook_url,
        source: "api",
      });

      result.credits_remaining = remaining;
      result.metadata = body.metadata;
      result.webhook_url = body.webhook_url;

      after(() => {
        console.log(`[VIDEO] Starting async render for ${cookId}`);
        renderVideoAsync(cookId, auth.userId, body)
          .then(() => console.log(`[VIDEO] Render complete for ${cookId}`))
          .catch((err) => console.error(`[VIDEO] Render failed for ${cookId}:`, err));
      });

      return Response.json(result, { status: 202 });
    } catch (err) {
      await fetchMutation(api.userProfiles.refund, {
        userId: auth.userId,
        amount: creditsNeeded,
      }).catch(console.error);
      console.error("Failed to create video release:", err);
      return Response.json(
        { error: "Something burned. Try again." },
        { status: 500 }
      );
    }
  }

  // ── Image branch ──────────────────────────────────────────────

  const imageBody = body as ReleaseRequest;

  try {
    const result = await createRelease(imageBody, auth.userId, { source: "api" });
    result.credits_remaining = remaining;
    after(() => renderReleaseAsync(result.cook_id, imageBody, auth.userId));
    return Response.json(result, { status: 202 });
  } catch (err) {
    await fetchMutation(api.userProfiles.refund, {
      userId: auth.userId,
      amount: creditsNeeded,
    }).catch(console.error);
    console.error("Failed to create release:", err);
    return Response.json(
      { error: "Something burned. Try again." },
      { status: 500 }
    );
  }
}
