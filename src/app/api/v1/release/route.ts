import { validateApiKey } from "@/lib/auth/validate-api-key";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { validateReleaseColors } from "@/lib/validation";
import { createRelease, renderReleaseAsync } from "@/lib/pipeline/render";
import { ReleaseRequest } from "@/lib/types";
import { fetchMutation } from "convex/nextjs";
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

  if (!body.slides || !Array.isArray(body.slides) || body.slides.length === 0) {
    return Response.json({ error: "At least 1 slide is required" }, { status: 400 });
  }
  if (body.slides.length > 5) {
    return Response.json({ error: "Maximum 5 slides allowed" }, { status: 400 });
  }
  for (const slide of body.slides) {
    if (!slide.objects && !slide.title) {
      return Response.json({ error: "Each slide requires an objects array. See GET /api/v1/templates/:id for available object IDs." }, { status: 400 });
    }
    if (slide.objects) {
      if (!Array.isArray(slide.objects)) {
        return Response.json({ error: "slides[].objects must be an array" }, { status: 400 });
      }
      for (const mod of slide.objects) {
        if (!mod.id || typeof mod.id !== "string") {
          return Response.json({ error: "Each object requires a string id" }, { status: 400 });
        }
      }
    }
  }
  if (body.template) {
    const validDefaults = ["classic", "split", "hero"];
    const isDefault = validDefaults.includes(body.template);
    const isCustom = typeof body.template === "string" && body.template.startsWith("tmpl_");
    if (!isDefault && !isCustom) {
      return Response.json(
        { error: "Invalid template. Must be classic, split, hero, or a template ID (tmpl_...)" },
        { status: 400 }
      );
    }
  }
  if (body.formats) {
    const valid = ["landscape", "square", "portrait"];
    for (const f of body.formats) {
      if (!valid.includes(f)) {
        return Response.json({ error: `Invalid format: ${f}` }, { status: 400 });
      }
    }
  }

  // Validate brand_id OR inline colors
  const colorError = validateReleaseColors(body as unknown as Record<string, unknown>);
  if (colorError) {
    return Response.json({ error: colorError }, { status: 400 });
  }

  // Atomically reserve credits BEFORE render (prevents race conditions)
  const formats = body.formats || ["landscape", "square", "portrait"];
  const creditsNeeded = body.slides.length * formats.length;

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
      amount: creditsNeeded,
    }).catch(console.error);
    console.error("Failed to create release:", err);
    return Response.json(
      { error: "Something burned. Try again." },
      { status: 500 }
    );
  }
}
