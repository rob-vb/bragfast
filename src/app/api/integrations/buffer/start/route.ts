import { NextRequest } from "next/server";
import crypto from "crypto";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { buildAuthorizeUrl } from "@/lib/integrations/buffer/oauth";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * GET /api/integrations/buffer/start
 *
 * Requires an active session (dashboard only — no API key auth for OAuth flows).
 * Generates a CSRF state nonce, stores it in oauthStates (TTL 10 min),
 * and redirects the user to Buffer's authorization page.
 */
export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", request.nextUrl.pathname);
    return Response.redirect(loginUrl.toString());
  }

  const clientId = process.env.BUFFER_CLIENT_ID;
  const redirectUri = process.env.BUFFER_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    console.error("[buffer/start] Missing BUFFER_CLIENT_ID or BUFFER_REDIRECT_URI");
    return Response.redirect(
      new URL("/admin/account?error=buffer_misconfigured", request.url).toString(),
    );
  }

  // Generate a cryptographically secure state nonce.
  const state = crypto.randomBytes(32).toString("hex");

  // Persist the nonce server-side (TTL 10 min) so the callback can verify it.
  await convex.mutation(api.oauthState.issueStateAction, {
    userId: user._id,
    provider: "buffer",
    state,
  });

  const authorizeUrl = buildAuthorizeUrl({ clientId, redirectUri, state });

  return Response.redirect(authorizeUrl);
}
