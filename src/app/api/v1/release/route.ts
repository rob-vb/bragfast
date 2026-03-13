import { validateApiKey } from "@/lib/auth/validate-api-key";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { validateReleaseColors, validateFormats } from "@/lib/validation";
import { createRelease, renderReleaseAsync } from "@/lib/pipeline/render";
import { ReleaseRequest, calculateCredits } from "@/lib/types";
import { fetchMutation, fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";

export async function POST(request: Request) {
  const auth = await validateApiKey(request);
  if (!auth) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimitResponse = await checkRateLimit(auth.userId);
  if (rateLimitResponse) return rateLimitResponse;

  let body: ReleaseRequest;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Format & slide validation
  const formatError = validateFormats(body.formats);
  if (formatError) {
    return Response.json({ error: formatError }, { status: 400 });
  }

  // Template validation (unchanged)
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

  // Validate brand_id OR inline colors
  const colorError = validateReleaseColors(body as unknown as Record<string, unknown>);
  if (colorError) {
    return Response.json({ error: colorError }, { status: 400 });
  }

  // Verify brand exists when brand_id is provided
  if (body.brand_id) {
    const brand = await fetchQuery(api.brands.getByExternalId, {
      externalId: body.brand_id,
    });
    if (!brand || brand.userId !== auth.userId) {
      return Response.json({ error: "Brand not found" }, { status: 404 });
    }
  }

  // Atomically reserve credits BEFORE render (prevents race conditions)
  const creditsNeeded = calculateCredits(body.formats);

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
    const result = await createRelease(body, auth.userId);
    result.credits_remaining = remaining;
    // Credits already reserved — render refunds on failure
    renderReleaseAsync(result.release_id, body, auth.userId).catch(
      console.error
    );
    return Response.json(result, { status: 202 });
  } catch (err) {
    // Refund on release creation failure
    await fetchMutation(api.userProfiles.refund, {
      userId: auth.userId,
      amount: calculateCredits(body.formats),
    }).catch(console.error);
    console.error("Failed to create release:", err);
    return Response.json(
      { error: "Something burned. Try again." },
      { status: 500 }
    );
  }
}
