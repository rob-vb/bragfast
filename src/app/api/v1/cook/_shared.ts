import { authenticate } from "@/lib/auth/authenticate";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import {
  validateReleaseColors,
  validateFormats,
} from "@/lib/validation";
import { fetchQuery, fetchMutation } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import type { FormatEntry, ReleaseRequest } from "@/lib/types";

export const VALID_DEFAULT_TEMPLATES = [
  "standard-browser",
  "standard-mobile",
  "split-browser",
  "split-mobile",
  "hero",
] as const;

export function isValidTemplateName(template: unknown): boolean {
  if (typeof template !== "string") return false;
  // .includes() on a const tuple only accepts its union type as argument — widening to string[] is safe here.
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

export async function parseJsonBody(
  request: Request
): Promise<Record<string, unknown> | Response> {
  try {
    const body = await request.json();
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return Response.json({ error: "Request body must be a JSON object" }, { status: 400 });
    }
    return body as Record<string, unknown>;
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

  if (body.brand_id !== undefined) {
    if (typeof body.brand_id !== "string" || body.brand_id === "") {
      return Response.json({ error: "brand_id must be a non-empty string" }, { status: 400 });
    }
    const brand = await fetchQuery(api.brands.getByExternalId, {
      externalId: body.brand_id,
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
 * Maps a validated request body to the ReleaseRequest shape the pipeline expects.
 * Call AFTER validateCommonFields has accepted the body. Picks only known fields;
 * unknown keys are dropped so downstream code never sees caller-supplied garbage.
 */
export function toReleaseRequest(body: Record<string, unknown>): ReleaseRequest {
  const request: ReleaseRequest = {
    formats: body.formats as FormatEntry[],
  };
  if (typeof body.brand_id === "string") request.brand_id = body.brand_id;
  if (typeof body.name === "string") request.name = body.name;
  if (typeof body.logo_url === "string") request.logo_url = body.logo_url;
  if (typeof body.font_family === "string") request.font_family = body.font_family;
  if (typeof body.template === "string") {
    request.template = body.template as ReleaseRequest["template"];
  }
  if (typeof body.metadata === "string") request.metadata = body.metadata;
  if (typeof body.webhook_url === "string") request.webhook_url = body.webhook_url;
  if (body.colors && typeof body.colors === "object") {
    request.colors = body.colors as ReleaseRequest["colors"];
  }
  return request;
}

/**
 * Refunds reserved credits and returns the standard 500 response. Swallows refund
 * errors with a structured console.error — credits may leak if the refund mutation
 * itself fails, which is logged for later reconciliation.
 */
export async function refundAndFail(
  userId: string,
  amount: number,
  context: string
): Promise<Response> {
  await fetchMutation(api.userProfiles.refund, { userId, amount }).catch((err) => {
    console.error(`[cook] Refund failed userId=${userId} amount=${amount} context=${context}:`, err);
  });
  return Response.json({ error: "Something burned. Try again." }, { status: 500 });
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
