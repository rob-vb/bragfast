import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import { authenticate } from "@/lib/auth/authenticate";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

const VALID_FORMATS = new Set([
  "square",
  "landscape",
  "portrait",
  "video-square",
  "video-landscape",
  "video-portrait",
] as const);

type Format =
  | "square"
  | "landscape"
  | "portrait"
  | "video-square"
  | "video-landscape"
  | "video-portrait";

type PostingProvider = "buffer" | "postiz";

interface ChannelEntry {
  provider: PostingProvider;
  channelId: string;
}

/**
 * GET /api/v1/routing-defaults
 * Returns all routing default rows for the authenticated user.
 * Response: { formats: [{ format, channels: [{ provider, channelId }] }] }
 */
export async function GET(request: Request) {
  const auth = await authenticate(request);
  if (!auth) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await convex.query(api.routingDefaults.listByUser, {
    userId: auth.userId,
  });

  return Response.json({
    formats: rows.map((r) => ({ format: r.format, channels: r.channels })),
  });
}

/**
 * PUT /api/v1/routing-defaults
 * Upserts channel selections for a single format.
 * Body: { format: string, channels: [{ provider, channelId }] }
 */
export async function PUT(request: Request) {
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

  if (!raw || typeof raw !== "object") {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }

  const body = raw as Record<string, unknown>;

  if (typeof body.format !== "string" || !VALID_FORMATS.has(body.format as Format)) {
    return Response.json(
      {
        error: `format must be one of: ${[...VALID_FORMATS].join(", ")}`,
      },
      { status: 400 },
    );
  }

  if (!Array.isArray(body.channels)) {
    return Response.json({ error: "channels must be an array" }, { status: 400 });
  }

  const channels: ChannelEntry[] = [];
  for (const item of body.channels as unknown[]) {
    if (!item || typeof item !== "object") {
      return Response.json(
        { error: "each channel entry must be an object" },
        { status: 400 },
      );
    }
    const entry = item as Record<string, unknown>;
    if (entry.provider !== "buffer" && entry.provider !== "postiz") {
      return Response.json(
        { error: "channel provider must be 'buffer' or 'postiz'" },
        { status: 400 },
      );
    }
    if (typeof entry.channelId !== "string" || !entry.channelId) {
      return Response.json({ error: "channel channelId must be a non-empty string" }, { status: 400 });
    }
    channels.push({
      provider: entry.provider as PostingProvider,
      channelId: entry.channelId,
    });
  }

  await convex.mutation(api.routingDefaults.upsert, {
    userId: auth.userId,
    format: body.format as Format,
    channels,
  });

  return Response.json({ ok: true });
}
