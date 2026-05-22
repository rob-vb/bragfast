import { ConvexHttpClient } from "convex/browser";
import { createHmac } from "crypto";
import { api } from "@convex/_generated/api";
import { authenticate } from "@/lib/auth/authenticate";
import { checkSubscriptionGate } from "@/lib/auth/subscription-gate";
import { publicUrlForKey } from "@/lib/storage/r2";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

const ALLOWED_FORMATS = ["landscape", "square", "portrait"] as const;
const allowedFormatSet = new Set<string>(ALLOWED_FORMATS);

type ImageFormat = (typeof ALLOWED_FORMATS)[number];
type Scheduling = { type: "queue" } | { type: "custom"; scheduledAt: string };
type Selection = {
  format: ImageFormat;
  provider: "buffer";
  channelId: string;
  channelName?: string;
};
type SchedulePayload = {
  draftId: string;
  urls: Record<string, string>;
  keys: Record<string, string>;
  selections: Selection[];
  caption: string;
  scheduling: Scheduling;
};
type ServerProofPayload = {
  userId: string;
  draftId: string;
  keys: Record<string, string>;
  selections: Selection[];
  caption: string;
  scheduling: Scheduling;
  issuedAt: number;
};

function isSafeId(value: string): boolean {
  return value.length > 0 && !value.includes("..") && !value.includes("/");
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isValidationError<T>(value: T | { error: string }): value is { error: string } {
  return isPlainRecord(value) && typeof value.error === "string";
}

function parseImageStringRecord(
  value: unknown,
  fieldName: string,
): Record<string, string> | { error: string } {
  if (!isPlainRecord(value)) {
    return { error: `${fieldName} must be an object keyed by image format` };
  }

  const parsed: Record<string, string> = {};
  for (const [format, entry] of Object.entries(value)) {
    if (!allowedFormatSet.has(format)) {
      return {
        error: `${fieldName} may only contain image formats: ${ALLOWED_FORMATS.join(", ")}`,
      };
    }
    if (typeof entry !== "string" || entry.length === 0) {
      return { error: `${fieldName}.${format} must be a non-empty string` };
    }
    parsed[format] = entry;
  }

  return parsed;
}

function parseSelections(value: unknown): Selection[] | { error: string } {
  if (!Array.isArray(value) || value.length === 0) {
    return { error: "selections must be a non-empty array" };
  }

  const selections: Selection[] = [];
  for (const item of value) {
    if (!isPlainRecord(item)) {
      return { error: "each selection must be an object" };
    }
    if (typeof item.format !== "string" || !allowedFormatSet.has(item.format)) {
      return {
        error: `selection format must be one of: ${ALLOWED_FORMATS.join(", ")}`,
      };
    }
    if (item.provider !== "buffer") {
      return { error: "selection provider must be buffer" };
    }
    if (typeof item.channelId !== "string" || item.channelId.length === 0) {
      return { error: "selection channelId must be a non-empty string" };
    }
    if (
      item.channelName !== undefined &&
      typeof item.channelName !== "string"
    ) {
      return { error: "selection channelName must be a string when provided" };
    }

    selections.push({
      format: item.format as ImageFormat,
      provider: "buffer",
      channelId: item.channelId,
      ...(item.channelName ? { channelName: item.channelName } : {}),
    });
  }

  return selections;
}

function isValidIsoDate(value: string): boolean {
  const time = Date.parse(value);
  return Number.isFinite(time) && new Date(time).toISOString() === value;
}

function parseScheduling(value: unknown): Scheduling | { error: string } {
  if (!isPlainRecord(value)) {
    return { error: "scheduling must be an object" };
  }

  if (value.type === "queue") {
    return { type: "queue" };
  }

  if (value.type === "custom") {
    if (
      typeof value.scheduledAt !== "string" ||
      !isValidIsoDate(value.scheduledAt)
    ) {
      return { error: "custom scheduling requires valid ISO scheduledAt" };
    }
    return { type: "custom", scheduledAt: value.scheduledAt };
  }

  return { error: "scheduling.type must be queue or custom" };
}

function parseSchedulePayload(raw: unknown): SchedulePayload | { error: string } {
  if (!isPlainRecord(raw)) {
    return { error: "invalid body" };
  }

  if (typeof raw.draftId !== "string" || !isSafeId(raw.draftId)) {
    return { error: "draftId must be a safe non-empty string" };
  }

  const urls = parseImageStringRecord(raw.urls, "urls");
  if (isValidationError(urls)) return urls;

  const keys = parseImageStringRecord(raw.keys, "keys");
  if (isValidationError(keys)) return keys;

  const selections = parseSelections(raw.selections);
  if ("error" in selections) return selections;

  if (typeof raw.caption !== "string") {
    return { error: "caption must be a string" };
  }

  const scheduling = parseScheduling(raw.scheduling);
  if ("error" in scheduling) return scheduling;

  return {
    draftId: raw.draftId,
    urls,
    keys,
    selections,
    caption: raw.caption,
    scheduling,
  };
}

function canonicalize(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, entry]) => `${JSON.stringify(key)}:${canonicalize(entry)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function createServerProof(payload: ServerProofPayload) {
  const secret = process.env.INTERNAL_API_SECRET;
  if (!secret) {
    throw new Error("INTERNAL_API_SECRET is not set");
  }
  return {
    issuedAt: payload.issuedAt,
    signature: createHmac("sha256", secret)
      .update(canonicalize(payload))
      .digest("hex"),
  };
}

function deriveScheduleUrls(
  authUserId: string,
  payload: SchedulePayload,
): Record<string, string> | { error: string } {
  const selectedFormats = new Set(payload.selections.map((selection) => selection.format));
  for (const format of Object.keys(payload.keys)) {
    if (!selectedFormats.has(format as ImageFormat)) {
      return { error: "upload key does not match authenticated draft" };
    }
  }

  const derivedUrls: Record<string, string> = {};
  for (const selection of payload.selections) {
    const expectedKey = `scheduled/${authUserId}/${payload.draftId}/${selection.format}.jpg`;
    const key = payload.keys[selection.format];
    if (key !== expectedKey) {
      return { error: "upload key does not match authenticated draft" };
    }
    derivedUrls[selection.format] = publicUrlForKey(key);
  }

  return derivedUrls;
}

function mapScheduleError(result: { error: string; missing?: readonly string[] }) {
  if (result.error === "upload_missing") {
    return Response.json(
      {
        ok: false,
        error: result.error,
        message:
          "One or more selected uploads are missing. Re-upload and retry scheduling.",
        ...(result.missing ? { missing: result.missing } : {}),
      },
      { status: 409 },
    );
  }

  if (result.error === "buffer_not_connected") {
    return Response.json(
      {
        ok: false,
        error: result.error,
        message: "Connect Buffer before scheduling posts.",
      },
      { status: 400 },
    );
  }

  return Response.json(
    {
      ok: false,
      error: result.error,
      message: "Scheduling provider failed. Check provider auth and channel access.",
    },
    { status: 502 },
  );
}

export async function POST(request: Request) {
  const auth = await authenticate(request);
  if (!auth) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const gate = await checkSubscriptionGate(auth.userId);
  if (gate) return gate;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return Response.json({ error: "invalid JSON" }, { status: 400 });
  }

  const payload = parseSchedulePayload(raw);
  if ("error" in payload) {
    return Response.json({ error: payload.error }, { status: 400 });
  }

  const derivedUrls = deriveScheduleUrls(auth.userId, payload);
  if ("error" in derivedUrls) {
    return Response.json({ error: derivedUrls.error }, { status: 400 });
  }

  let serverProof: { issuedAt: number; signature: string };
  try {
    const issuedAt = Date.now();
    serverProof = createServerProof({
      userId: auth.userId,
      draftId: payload.draftId,
      keys: payload.keys,
      selections: payload.selections,
      caption: payload.caption,
      scheduling: payload.scheduling,
      issuedAt,
    });
  } catch {
    return Response.json(
      { error: "schedule server proof is not configured" },
      { status: 500 },
    );
  }

  const result = await convex.action(api.schedulePush.run, {
    userId: auth.userId,
    ...payload,
    urls: derivedUrls,
    serverProof,
  });

  if (!result.ok) {
    return mapScheduleError(result);
  }

  return Response.json(result);
}
