import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import { authenticate } from "@/lib/auth/authenticate";
import { seal } from "@/lib/crypto/secret-box";
import { tierFor, capsFor } from "@/lib/plan-tiers";
import { ALLOWED_POSTHOG_HOST_SET } from "@/lib/integrations/posthog-hosts";
import {
  listIntegrations,
  normalizeInstanceUrl,
  PostizAuthError,
} from "@/lib/integrations/postiz/client";
import {
  validateApiKey as validateBufferKey,
  fetchChannels as fetchBufferChannels,
  BufferAuthError,
} from "@/lib/integrations/buffer/client";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

type StripeBody = { provider: "stripe"; apiKey: string };
type PostHogBody = {
  provider: "posthog";
  apiKey: string;
  projectId: string;
  host: string;
};
type Ga4Body = {
  provider: "ga4";
  serviceAccountJson: string;
  propertyId: string;
};
type PostizBody = {
  provider: "postiz";
  instanceUrl: string;
  apiKey: string;
};
type BufferBody = {
  provider: "buffer";
  apiKey: string;
};
type Body = StripeBody | PostHogBody | Ga4Body | PostizBody | BufferBody;

export function validateBody(raw: unknown): Body | { error: string } {
  if (!raw || typeof raw !== "object") return { error: "invalid body" };
  const b = raw as Record<string, unknown>;
  if (b.provider === "stripe") {
    if (typeof b.apiKey !== "string" || b.apiKey.length < 10) {
      return { error: "apiKey required" };
    }
    if (!b.apiKey.startsWith("rk_") && !b.apiKey.startsWith("sk_")) {
      return { error: "Stripe key must start with rk_ or sk_" };
    }
    return { provider: "stripe", apiKey: b.apiKey };
  }
  if (b.provider === "posthog") {
    if (typeof b.apiKey !== "string" || b.apiKey.length < 10)
      return { error: "apiKey required" };
    if (typeof b.projectId !== "string" || !b.projectId)
      return { error: "projectId required" };
    if (typeof b.host !== "string" || !ALLOWED_POSTHOG_HOST_SET.has(b.host))
      return { error: "host must be a known PostHog cloud URL" };
    return {
      provider: "posthog",
      apiKey: b.apiKey,
      projectId: b.projectId,
      host: b.host,
    };
  }
  if (b.provider === "ga4") {
    if (typeof b.serviceAccountJson !== "string" || b.serviceAccountJson.length < 50)
      return { error: "serviceAccountJson required" };
    if (typeof b.propertyId !== "string" || !b.propertyId)
      return { error: "propertyId required" };
    try {
      const parsed = JSON.parse(b.serviceAccountJson);
      if (!parsed.client_email || !parsed.private_key) {
        return { error: "service account JSON missing client_email/private_key" };
      }
    } catch {
      return { error: "service account JSON is not valid JSON" };
    }
    return {
      provider: "ga4",
      serviceAccountJson: b.serviceAccountJson,
      propertyId: b.propertyId,
    };
  }
  if (b.provider === "postiz") {
    if (typeof b.apiKey !== "string" || b.apiKey.length < 4)
      return { error: "apiKey required" };
    if (typeof b.instanceUrl !== "string" || !b.instanceUrl)
      return { error: "instanceUrl required" };
    if (!b.instanceUrl.startsWith("http://") && !b.instanceUrl.startsWith("https://"))
      return { error: "instanceUrl must include a scheme (https:// or http://)" };
    const isDev = process.env.NODE_ENV === "development";
    if (b.instanceUrl.startsWith("http://") && !isDev)
      return { error: "https required: http is only allowed in development" };
    const normalizedUrl = b.instanceUrl.replace(/\/+$/, "");
    return { provider: "postiz", instanceUrl: normalizedUrl, apiKey: b.apiKey };
  }
  if (b.provider === "buffer") {
    if (typeof b.apiKey !== "string" || b.apiKey.length < 8)
      return { error: "apiKey required" };
    return { provider: "buffer", apiKey: b.apiKey };
  }
  return { error: "unknown provider" };
}

export async function POST(request: Request) {
  const auth = await authenticate(request);
  if (!auth) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return Response.json({ error: "invalid JSON" }, { status: 400 });
  }

  const body = validateBody(raw);
  if ("error" in body) {
    return Response.json({ error: body.error }, { status: 400 });
  }

  const { userId } = auth;

  // S4.2: source-cap enforcement — analytics providers (stripe/posthog/ga4)
  // count toward the tier's `sources` quota along with GitHub installations.
  // Posting providers (buffer/postiz) bypass.
  if (
    body.provider === "stripe" ||
    body.provider === "posthog" ||
    body.provider === "ga4"
  ) {
    const profile = await convex.query(api.userProfiles.getByUserId, {
      userId,
    });
    const tier = profile ? tierFor(profile.plan) : null;
    if (tier) {
      const caps = capsFor(tier);
      if (caps.sources !== "unlimited") {
        const [existing, ghInstalls] = await Promise.all([
          convex.query(api.integrationSecrets.listByUser, { userId }),
          convex.query(api.githubInstallations.listByUserId, { userId }),
        ]);
        const isReconnect = existing.some(
          (r) => r.provider === body.provider && r.enabled,
        );
        if (!isReconnect) {
          const connectedAnalytics = (
            ["stripe", "posthog", "ga4"] as const
          ).filter((p) =>
            existing.some((r) => r.provider === p && r.enabled),
          ).length;
          const githubConnected = ghInstalls.some(
            (i) => i.status === "active" && i.enabled,
          );
          const connectedSourceCount =
            connectedAnalytics + (githubConnected ? 1 : 0);
          if (connectedSourceCount >= caps.sources) {
            return Response.json(
              {
                error: "source_cap_reached",
                tier,
                cap: caps.sources,
                current: connectedSourceCount,
              },
              { status: 403 },
            );
          }
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // Buffer: probe API key, then store. Same shape as Postiz — paste-key BYO.
  // -------------------------------------------------------------------------
  if (body.provider === "buffer") {
    let account: Awaited<ReturnType<typeof validateBufferKey>>;
    try {
      account = await validateBufferKey(body.apiKey);
    } catch (err) {
      if (err instanceof BufferAuthError) {
        return Response.json({ error: "key rejected by Buffer" }, { status: 400 });
      }
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("timeout") || msg.includes("AbortError")) {
        return Response.json(
          { error: "Buffer API did not respond in time" },
          { status: 504 },
        );
      }
      console.error("[buffer] probe failed:", err);
      return Response.json(
        { error: "Could not reach Buffer API, please retry" },
        { status: 504 },
      );
    }

    if (account.organizations.length > 1) {
      console.warn(
        `[buffer] API key has ${account.organizations.length} organizations — using first (${account.organizationId}). Org-picker UI deferred.`,
      );
    }

    let channels: Awaited<ReturnType<typeof fetchBufferChannels>>;
    try {
      channels = await fetchBufferChannels(body.apiKey, account.organizationId);
    } catch (err) {
      console.error("[buffer] channels fetch failed:", err);
      return Response.json(
        { error: "Buffer probe succeeded but channels fetch failed, please retry" },
        { status: 504 },
      );
    }

    const sealed = seal(body.apiKey);
    const extra = JSON.stringify({
      organizationId: account.organizationId,
      channels,
    });

    await convex.action(api.integrationSecrets.upsertAction, {
      userId,
      provider: "buffer",
      ciphertext: sealed.ciphertext,
      iv: sealed.iv,
      tag: sealed.tag,
      extra,
    });

    return Response.json({
      ok: true,
      provider: "buffer",
      channelCount: channels.length,
    });
  }

  // -------------------------------------------------------------------------
  // Postiz: probe first, then store. Different from analytics providers which
  // store then seed. We must not persist anything until the probe succeeds.
  // -------------------------------------------------------------------------
  if (body.provider === "postiz") {
    let channels: Awaited<ReturnType<typeof listIntegrations>>;
    try {
      channels = await listIntegrations(body.instanceUrl, body.apiKey);
    } catch (err) {
      if (err instanceof PostizAuthError) {
        return Response.json({ error: "key rejected by Postiz" }, { status: 400 });
      }
      const msg = err instanceof Error ? err.message : String(err);
      if (
        msg.includes("instance URL not reachable") ||
        msg.includes("DNS resolution failed") ||
        msg.includes("https required") ||
        msg.includes("instanceUrl must include a scheme")
      ) {
        return Response.json({ error: msg }, { status: 400 });
      }
      if (msg.includes("timed out")) {
        return Response.json(
          { error: "Postiz instance did not respond in time" },
          { status: 504 },
        );
      }
      console.error("[postiz] probe failed:", err);
      return Response.json(
        { error: "Could not reach Postiz instance, please retry" },
        { status: 504 },
      );
    }

    const sealed = seal(body.apiKey);
    const extra = JSON.stringify({ instanceUrl: body.instanceUrl, channels });

    await convex.action(api.integrationSecrets.upsertAction, {
      userId,
      provider: "postiz",
      ciphertext: sealed.ciphertext,
      iv: sealed.iv,
      tag: sealed.tag,
      extra,
    });

    // No seedAction for Postiz — posting providers skip scan/seed semantics.
    return Response.json({ ok: true, provider: "postiz", channelCount: channels.length });
  }

  // -------------------------------------------------------------------------
  // Analytics providers: store then seed
  // -------------------------------------------------------------------------
  const plaintextSecret =
    body.provider === "ga4" ? body.serviceAccountJson : body.apiKey;
  const sealed = seal(plaintextSecret);

  const extra =
    body.provider === "posthog"
      ? JSON.stringify({ projectId: body.projectId, host: body.host })
      : body.provider === "ga4"
        ? JSON.stringify({ propertyId: body.propertyId })
        : undefined;

  await convex.action(api.integrationSecrets.upsertAction, {
    userId,
    provider: body.provider,
    ciphertext: sealed.ciphertext,
    iv: sealed.iv,
    tag: sealed.tag,
    extra,
  });

  try {
    await convex.action(api.sousChef.seedAction, {
      userId,
      provider: body.provider,
    });
  } catch (err) {
    console.error("[sous-chef] seed on connect failed:", err);
    await convex.action(api.integrationSecrets.disconnectAction, {
      userId,
      provider: body.provider,
    });
    return Response.json(
      { error: "seed failed, please retry" },
      { status: 502 },
    );
  }

  return Response.json({ ok: true, provider: body.provider });
}

export async function GET(request: Request) {
  const auth = await authenticate(request);
  if (!auth) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rows = await convex.query(api.integrationSecrets.listByUser, {
    userId: auth.userId,
  });
  return Response.json({ integrations: rows });
}

export async function DELETE(request: Request) {
  const auth = await authenticate(request);
  if (!auth) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(request.url);
  const providerParam = url.searchParams.get("provider");
  if (
    providerParam !== "stripe" &&
    providerParam !== "posthog" &&
    providerParam !== "ga4" &&
    providerParam !== "buffer" &&
    providerParam !== "postiz"
  ) {
    return Response.json({ error: "invalid provider" }, { status: 400 });
  }
  const removed = await convex.action(api.integrationSecrets.disconnectAction, {
    userId: auth.userId,
    provider: providerParam,
  });
  return Response.json({ ok: removed });
}
