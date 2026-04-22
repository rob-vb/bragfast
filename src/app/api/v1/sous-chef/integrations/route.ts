import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import { authenticate } from "@/lib/auth/authenticate";
import { seal } from "@/lib/crypto/secret-box";

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
type Body = StripeBody | PostHogBody | Ga4Body;

function validateBody(raw: unknown): Body | { error: string } {
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
    if (typeof b.host !== "string" || !b.host.startsWith("http"))
      return { error: "host required (https://...)" };
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
  const plaintextSecret =
    body.provider === "ga4" ? body.serviceAccountJson : body.apiKey;
  const sealed = seal(plaintextSecret);

  const extra =
    body.provider === "posthog"
      ? JSON.stringify({ projectId: body.projectId, host: body.host })
      : body.provider === "ga4"
        ? JSON.stringify({ propertyId: body.propertyId })
        : undefined;

  await convex.mutation(api.integrationSecrets.upsert, {
    userId,
    provider: body.provider,
    ciphertext: sealed.ciphertext,
    iv: sealed.iv,
    tag: sealed.tag,
    extra,
  });

  // Seed already-crossed thresholds so the first cron doesn't flood.
  // Run in-line: if seeding fails, user still gets a clean integration row,
  // but a next-day scan will fire historical milestones (acceptable fallback).
  try {
    await convex.action(api.sousChef.seed, {
      userId,
      provider: body.provider,
    });
  } catch (err) {
    console.error("[sous-chef] seed on connect failed:", err);
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
    providerParam !== "ga4"
  ) {
    return Response.json({ error: "invalid provider" }, { status: 400 });
  }
  const removed = await convex.mutation(api.integrationSecrets.disconnect, {
    userId: auth.userId,
    provider: providerParam,
  });
  return Response.json({ ok: removed });
}
