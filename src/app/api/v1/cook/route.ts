import { after } from "next/server";

export const maxDuration = 60;

import { validateApiKey } from "@/lib/auth/validate-api-key";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { validateReleaseColors, validateFormats, validateVideoFormats, validateVideoTemplate } from "@/lib/validation";
import { createRelease, renderReleaseAsync } from "@/lib/pipeline/render";
import { ReleaseRequest, calculateCredits } from "@/lib/types";
import { fetchMutation, fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";

// Lazy-loaded to avoid pulling Remotion's heavy native deps into every request
const loadVideoModules = () => Promise.all([
  import("@/lib/video/validation"),
  import("@/lib/video/defaults"),
  import("@/lib/pipeline/render-video"),
] as const);

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

  const isVideo = body.output === "video";

  // Validate brand_id OR inline colors (shared for both image and video)
  const colorError = validateReleaseColors(body as Record<string, unknown>);
  if (colorError) {
    return Response.json({ error: colorError }, { status: 400 });
  }

  // Verify brand exists when brand_id is provided (shared)
  if (body.brand_id) {
    const brand = await fetchQuery(api.brands.getByExternalId, {
      externalId: body.brand_id,
    });
    if (!brand || brand.userId !== auth.userId) {
      return Response.json({ error: "Brand not found" }, { status: 404 });
    }
  }

  // ── Video branch ──────────────────────────────────────────────
  if (isVideo) {
    const [{ validateVideoScenes }, { getDefaultVideoTemplate }, { createVideoRelease, renderVideoAsync }] = await loadVideoModules();

    const videoFormatError = validateVideoFormats(body.formats);
    if (videoFormatError) {
      return Response.json({ error: videoFormatError }, { status: 400 });
    }

    const videoTemplateError = validateVideoTemplate(body.template);
    if (videoTemplateError) {
      return Response.json({ error: videoTemplateError }, { status: 400 });
    }

    // Resolve template config for scene validation
    const templateName = body.template ?? "product-update";
    let templateConfig = getDefaultVideoTemplate(templateName);

    // For custom templates, fetch from DB
    if (!templateConfig && templateName.startsWith("vtmpl_")) {
      const customTmpl = await fetchQuery(api.videoTemplates.getByExternalId, {
        externalId: templateName,
      });
      if (!customTmpl || customTmpl.userId !== auth.userId) {
        return Response.json({ error: "Video template not found" }, { status: 404 });
      }
      templateConfig = customTmpl.config;
    }

    if (!templateConfig) {
      return Response.json({ error: `Unknown video template: ${templateName}` }, { status: 400 });
    }

    // Validate scenes against template
    for (const format of body.formats) {
      const sceneError = validateVideoScenes(format.scenes, templateConfig.scenes);
      if (sceneError) {
        return Response.json({ error: `${format.name}: ${sceneError}` }, { status: 400 });
      }
    }

    const creditsNeeded = calculateCredits({ output: "video", formats: body.formats });

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

    try {
      const { cookId, result } = createVideoRelease(creditsNeeded);

      await fetchMutation(api.releases.create, {
        userId: auth.userId,
        externalId: cookId,
        template: body.template ?? "product-update",
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

  // ── Image branch (existing) ───────────────────────────────────
  const imageBody = body as ReleaseRequest;

  // Format & slide validation
  const formatError = validateFormats(imageBody.formats);
  if (formatError) {
    return Response.json({ error: formatError }, { status: 400 });
  }

  // Template validation
  if (imageBody.template) {
    const validDefaults = ["standard-browser", "standard-mobile", "split-browser", "split-mobile", "hero"];
    const isDefault = validDefaults.includes(imageBody.template);
    const isCustom = typeof imageBody.template === "string" && imageBody.template.startsWith("tmpl_");
    if (!isDefault && !isCustom) {
      return Response.json(
        { error: "Invalid template. Must be standard-browser, standard-mobile, split-browser, split-mobile, hero, or a template ID (tmpl_...)" },
        { status: 400 }
      );
    }
  }

  // Atomically reserve credits BEFORE render (prevents race conditions)
  const creditsNeeded = calculateCredits({ output: "image", formats: imageBody.formats });

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

  try {
    const result = await createRelease(imageBody, auth.userId, { source: "api" });
    result.credits_remaining = remaining;

    // DEBUG: render synchronously to surface errors in response
    const debugSync = request.headers.get("x-debug-sync") === "1";
    if (debugSync) {
      try {
        await renderReleaseAsync(result.cook_id, imageBody, auth.userId);
      } catch (renderErr) {
        return Response.json({
          error: "Render failed",
          details: renderErr instanceof Error ? renderErr.message : String(renderErr),
          stack: renderErr instanceof Error ? renderErr.stack : undefined,
        }, { status: 500 });
      }
      return Response.json({ ...result, status: "completed" }, { status: 200 });
    }

    after(() => renderReleaseAsync(result.cook_id, imageBody, auth.userId));
    return Response.json(result, { status: 202 });
  } catch (err) {
    // Refund on release creation failure
    await fetchMutation(api.userProfiles.refund, {
      userId: auth.userId,
      amount: calculateCredits({ output: "image", formats: imageBody.formats }),
    }).catch(console.error);
    console.error("Failed to create release:", err);
    return Response.json(
      { error: "Something burned. Try again." },
      { status: 500 }
    );
  }
}
