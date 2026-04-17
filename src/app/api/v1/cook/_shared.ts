import { authenticate } from "@/lib/auth/authenticate";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import {
  validateReleaseColors,
  validateFormats,
} from "@/lib/validation";
import { fetchQuery, fetchMutation } from "convex/nextjs";
import { api } from "@convex/_generated/api";

export const VALID_DEFAULT_TEMPLATES = [
  "standard-browser",
  "standard-mobile",
  "split-browser",
  "split-mobile",
  "hero",
] as const;

export function isValidTemplateName(template: unknown): boolean {
  if (typeof template !== "string") return false;
  if ((VALID_DEFAULT_TEMPLATES as readonly string[]).includes(template)) return true;
  return template.startsWith("tmpl_");
}

export async function authenticateAndCheckRateLimit(
  request: Request
): Promise<{ userId: string } | Response> {
  const auth = await authenticate(request);
  if (!auth) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimitResponse = await checkRateLimit(auth.userId);
  if (rateLimitResponse) return rateLimitResponse;

  return { userId: auth.userId };
}

export async function parseJsonBody(request: Request): Promise<unknown | Response> {
  try {
    return await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
}

/**
 * Runs the checks shared by /cook/image and /cook/video:
 * color hex validation, brand ownership, formats shape, template name.
 * Returns null on success or a Response representing the client error.
 */
export async function validateCommonFields(
  body: Record<string, unknown>,
  userId: string
): Promise<Response | null> {
  const colorError = validateReleaseColors(body);
  if (colorError) {
    return Response.json({ error: colorError }, { status: 400 });
  }

  if (body.brand_id) {
    const brand = await fetchQuery(api.brands.getByExternalId, {
      externalId: body.brand_id as string,
    });
    if (!brand || brand.userId !== userId) {
      return Response.json({ error: "Brand not found" }, { status: 404 });
    }
  }

  const formatError = validateFormats(body.formats);
  if (formatError) {
    return Response.json({ error: formatError }, { status: 400 });
  }

  if (body.template !== undefined && !isValidTemplateName(body.template)) {
    return Response.json(
      {
        error: `Invalid template. Must be one of: ${VALID_DEFAULT_TEMPLATES.join(", ")}, or a template ID (tmpl_...)`,
      },
      { status: 400 }
    );
  }

  return null;
}

/**
 * Reserves credits for a render. Returns `{ remaining }` on success or a Response
 * with a client-appropriate status (429 for insufficient credits, 403 for missing profile).
 * Unknown errors are re-thrown so the caller can convert them to 500s.
 */
export async function reserveCreditsOrError(
  userId: string,
  amount: number
): Promise<{ remaining: number } | Response> {
  try {
    const remaining = await fetchMutation(api.userProfiles.reserve, {
      userId,
      amount,
    });
    return { remaining };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("Insufficient credits")) {
      return Response.json(
        {
          error: "Your plate is empty. Pick a plan to keep serving.",
          credits_needed: amount,
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
}
