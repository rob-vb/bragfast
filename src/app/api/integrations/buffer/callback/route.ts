import { NextRequest } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { seal } from "@/lib/crypto/secret-box";
import { exchangeCode, fetchOrgAndChannels } from "@/lib/integrations/buffer/oauth";
import { BufferAuthError } from "@/lib/integrations/buffer/graphql";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

function errorRedirect(request: NextRequest, code: string): Response {
  return Response.redirect(
    new URL(`/admin/account?error=${code}`, request.url).toString(),
  );
}

/**
 * GET /api/integrations/buffer/callback
 *
 * Buffer OAuth 2.0 Authorization Code callback.
 *
 * Security checks (both required — neither alone is sufficient):
 *   1. Session cookie auth — ensures a real logged-in user is making the request.
 *   2. consumeState(state) — atomic single-use CSRF nonce validation, and
 *      asserts that state.userId === session.userId to prevent attacker-pre-issued
 *      state binding victim's account to attacker's Buffer.
 *
 * On success: seals tokens, stores them via upsertAction, probes org+channels,
 * redirects to /admin/account?connected=buffer.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errorParam = searchParams.get("error");

  // Buffer may return ?error=access_denied if the user declined.
  if (errorParam) {
    return errorRedirect(request, `buffer_denied`);
  }

  if (!state) {
    return new Response("Missing state parameter", { status: 400 });
  }

  if (!code) {
    return new Response("Missing code parameter", { status: 400 });
  }

  // --- Check 1: Session auth ---
  // Must run BEFORE consuming state so we don't destroy the nonce on unauthenticated requests.
  const user = await getSessionUser();
  if (!user) {
    // Preserve the callback URL so the user can return after login.
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set(
      "redirect",
      `${request.nextUrl.pathname}?${searchParams.toString()}`,
    );
    return Response.redirect(loginUrl.toString());
  }

  // --- Check 2: CSRF state nonce + session-binding ---
  // consumeState atomically deletes the row (single-use) and returns { userId, provider }
  // if valid and not expired, or null otherwise.
  const stateRow = await convex.mutation(api.oauthState.consumeStateAction, { state });

  if (!stateRow) {
    // Not found, already used, or expired.
    return new Response("Invalid or expired state parameter", { status: 400 });
  }

  // Session-binding: reject if the state was issued for a different user.
  // Without this check, an attacker could pre-issue state for their own account,
  // lure a victim to this callback URL, and bind the attacker's Buffer to the victim.
  if (stateRow.userId !== user._id) {
    return new Response("State/session user mismatch", { status: 403 });
  }

  // --- Exchange code for tokens ---
  let tokens: Awaited<ReturnType<typeof exchangeCode>>;
  try {
    tokens = await exchangeCode(code);
  } catch (err) {
    console.error("[buffer/callback] code exchange failed:", err);
    return errorRedirect(request, "invalid_code");
  }

  // --- Probe: fetch org + channels ---
  let orgInfo: Awaited<ReturnType<typeof fetchOrgAndChannels>>;
  try {
    orgInfo = await fetchOrgAndChannels(tokens.accessToken);
  } catch (err) {
    console.error("[buffer/callback] org/channel probe failed:", err);
    if (err instanceof BufferAuthError) {
      return errorRedirect(request, "probe_auth_failed");
    }
    return errorRedirect(request, "probe_failed");
  }

  // --- Seal and store ---
  const tokenPayload = JSON.stringify({
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt: tokens.expiresAt,
  });
  const sealed = seal(tokenPayload);
  const extra = JSON.stringify({
    organizationId: orgInfo.organizationId,
    channels: orgInfo.channels,
    expiresAt: tokens.expiresAt,
  });

  await convex.action(api.integrationSecrets.upsertAction, {
    userId: user._id,
    provider: "buffer",
    ciphertext: sealed.ciphertext,
    iv: sealed.iv,
    tag: sealed.tag,
    extra,
  });

  // --- Optional post-connect probe via seedAction (no-op for buffer in current sousChef) ---
  try {
    await convex.action(api.sousChef.seedAction, {
      userId: user._id,
      provider: "buffer",
    });
  } catch (err) {
    console.error("[buffer/callback] seedAction failed:", err);
    // Rollback the integration if probe fails, consistent with other connect flows.
    await convex.action(api.integrationSecrets.disconnectAction, {
      userId: user._id,
      provider: "buffer",
    });
    return errorRedirect(request, "probe_failed");
  }

  return Response.redirect(
    new URL("/admin/account?connected=buffer", request.url).toString(),
  );
}
