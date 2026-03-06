import { validateApiKey } from "@/lib/auth/validate-api-key";
import { validateReleaseColors } from "@/lib/validation";
import { createRelease, renderReleaseAsync } from "@/lib/pipeline/render";
import { ReleaseRequest } from "@/lib/types";
import { fetchQuery } from "convex/nextjs";
import { api } from "../../../../convex/_generated/api";

export async function POST(request: Request) {
  const auth = await validateApiKey(request);
  if (!auth) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

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
    if (!slide.title) {
      return Response.json({ error: "Each slide must have a title" }, { status: 400 });
    }
    if (slide.device && !["browser", "mobile"].includes(slide.device)) {
      return Response.json({ error: "Invalid device. Use: browser, mobile" }, { status: 400 });
    }
    if (slide.align && !["left", "center", "right"].includes(slide.align)) {
      return Response.json({ error: "Invalid align. Use: left, center, right" }, { status: 400 });
    }
  }
  if (body.template && !["classic", "split", "hero"].includes(body.template)) {
    return Response.json({ error: "Invalid template. Use: classic, split, hero" }, { status: 400 });
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

  // Check credits
  const formats = body.formats || ["landscape", "square", "portrait"];
  const creditsNeeded = body.slides.length * formats.length;

  const balance = await fetchQuery(api.userProfiles.getBalance, {
    userId: auth.userId,
  });
  if (balance < creditsNeeded) {
    return Response.json(
      {
        error: "Your plate is empty. Pick a plan to keep serving.",
        credits_remaining: balance,
        credits_needed: creditsNeeded,
      },
      { status: 429 }
    );
  }

  try {
    const result = await createRelease(body, auth.userId);
    result.credits_remaining = balance;
    renderReleaseAsync(result.release_id, body, auth.userId).catch(
      console.error
    );
    return Response.json(result, { status: 202 });
  } catch (err) {
    console.error("Failed to create release:", err);
    return Response.json(
      { error: "Something burned. Try again." },
      { status: 500 }
    );
  }
}
