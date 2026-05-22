"use node";

import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { createHash, createHmac, timingSafeEqual } from "crypto";
import { open } from "../src/lib/crypto/secret-box";
import { pushToBuffer } from "../src/lib/integrations/buffer/push";
import { headObject } from "../src/lib/storage/r2";

const formatValidator = v.union(
  v.literal("landscape"),
  v.literal("square"),
  v.literal("portrait"),
);

const schedulingValidator = v.union(
  v.object({ type: v.literal("queue") }),
  v.object({ type: v.literal("custom"), scheduledAt: v.string() }),
);

type Format = "landscape" | "square" | "portrait";
type Scheduling = { type: "queue" } | { type: "custom"; scheduledAt: string };
type Selection = {
  format: Format;
  provider: "buffer";
  channelId: string;
  channelName?: string;
};
type ScheduledPost = {
  format: Format;
  channelId: string;
  channelName?: string;
  providerPostId: string;
  scheduledAt?: string;
};
type ProviderPost = ScheduledPost & {
  provider: "buffer";
};
type ServerProof = {
  issuedAt: number;
  signature: string;
};

function missingFormats(
  keys: Record<string, string>,
  urls: Record<string, string>,
  selections: Selection[],
): string[] {
  const missing = new Set<string>();
  for (const selection of selections) {
    if (!keys[selection.format] || !urls[selection.format]) {
      missing.add(selection.format);
    }
  }
  return [...missing];
}

function scheduledAtFor(scheduling: Scheduling): string | undefined {
  return scheduling.type === "custom" ? scheduling.scheduledAt : undefined;
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

function verifyServerProof(args: {
  userId: string;
  draftId: string;
  keys: Record<string, string>;
  selections: Selection[];
  caption: string;
  scheduling: Scheduling;
  serverProof?: ServerProof;
}): boolean {
  const secret = process.env.INTERNAL_API_SECRET;
  if (!secret || !args.serverProof) return false;

  const now = Date.now();
  if (
    !Number.isFinite(args.serverProof.issuedAt) ||
    Math.abs(now - args.serverProof.issuedAt) > 5 * 60 * 1000
  ) {
    return false;
  }

  const expected = createHmac("sha256", secret)
    .update(
      canonicalize({
        userId: args.userId,
        draftId: args.draftId,
        keys: args.keys,
        selections: args.selections,
        caption: args.caption,
        scheduling: args.scheduling,
        issuedAt: args.serverProof.issuedAt,
      }),
    )
    .digest("hex");

  try {
    const expectedBuffer = Buffer.from(expected, "hex");
    const actualBuffer = Buffer.from(args.serverProof.signature, "hex");
    return (
      expectedBuffer.length === actualBuffer.length &&
      timingSafeEqual(expectedBuffer, actualBuffer)
    );
  } catch {
    return false;
  }
}

function scheduleRequestExternalId(args: {
  userId: string;
  draftId: string;
  keys: Record<string, string>;
  selections: Selection[];
  caption: string;
  scheduling: Scheduling;
}): string {
  const sortedSelections = [...args.selections].sort((a, b) =>
    `${a.format}:${a.provider}:${a.channelId}`.localeCompare(
      `${b.format}:${b.provider}:${b.channelId}`,
    ),
  );
  const digest = createHash("sha256")
    .update(
      canonicalize({
        userId: args.userId,
        draftId: args.draftId,
        keys: args.keys,
        selections: sortedSelections,
        caption: args.caption,
        scheduling: args.scheduling,
      }),
    )
    .digest("hex")
    .slice(0, 24);
  return `rel_${digest}`;
}

function parseMetadata(metadata: string | undefined): Record<string, unknown> {
  if (!metadata) return {};
  try {
    const parsed = JSON.parse(metadata) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function providerPostsFrom(metadata: Record<string, unknown>): ProviderPost[] {
  if (!Array.isArray(metadata.providerPosts)) return [];
  return metadata.providerPosts.filter((post): post is ProviderPost => {
    if (!post || typeof post !== "object" || Array.isArray(post)) return false;
    const candidate = post as Record<string, unknown>;
    return (
      typeof candidate.format === "string" &&
      candidate.provider === "buffer" &&
      typeof candidate.channelId === "string" &&
      typeof candidate.providerPostId === "string"
    );
  });
}

function findRecordedPost(posts: ProviderPost[], selection: Selection) {
  return posts.find(
    (post) =>
      post.format === selection.format &&
      post.provider === selection.provider &&
      post.channelId === selection.channelId,
  );
}

export const run = action({
  args: {
    userId: v.string(),
    draftId: v.string(),
    urls: v.record(v.string(), v.string()),
    keys: v.record(v.string(), v.string()),
    selections: v.array(
      v.object({
        format: formatValidator,
        provider: v.literal("buffer"),
        channelId: v.string(),
        channelName: v.optional(v.string()),
      }),
    ),
    caption: v.string(),
    scheduling: schedulingValidator,
    serverProof: v.optional(
      v.object({
        issuedAt: v.number(),
        signature: v.string(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    if (!verifyServerProof(args)) {
      return { ok: false, error: "unauthorized" } as const;
    }

    const preflightMissing = missingFormats(args.keys, args.urls, args.selections);
    if (preflightMissing.length > 0) {
      return { ok: false, error: "upload_missing", missing: preflightMissing } as const;
    }

    const missing: string[] = [];
    for (const [format, key] of Object.entries(args.keys)) {
      const exists = await headObject(key);
      if (!exists) missing.push(format);
    }
    if (missing.length > 0) {
      return { ok: false, error: "upload_missing", missing } as const;
    }

    const sealed = await ctx.runQuery(internal.integrationSecrets.getSealedForScan, {
      userId: args.userId,
      provider: "buffer",
    });
    if (!sealed) {
      return { ok: false, error: "buffer_not_connected" } as const;
    }

    const apiKey = open(sealed);
    const dueAt = scheduledAtFor(args.scheduling);
    const externalId = scheduleRequestExternalId(args);
    for (const selection of args.selections) {
      if (!args.urls[selection.format]) {
        return { ok: false, error: "upload_missing", missing: [selection.format] } as const;
      }
    }
    const channels = args.selections.map((selection) => ({
      format: selection.format,
      provider: selection.provider,
      channelId: selection.channelId,
        ...(selection.channelName ? { channelName: selection.channelName } : {}),
    }));

    const attempt = await ctx.runMutation(internal.releases.insertScheduledAttempt, {
      userId: args.userId,
      externalId,
      template: "local-render",
      images: args.urls,
      socialCopy: JSON.stringify({ caption: args.caption }),
      metadata: JSON.stringify({
        draftId: args.draftId,
        scheduling: args.scheduling,
        channels,
        providerPosts: [],
      }),
    });

    let metadata = parseMetadata(attempt.metadata);
    let providerPosts = providerPostsFrom(metadata);

    for (const selection of args.selections) {
      const recordedPost = findRecordedPost(providerPosts, selection);
      if (recordedPost) continue;

      try {
        const result = await pushToBuffer({
          apiKey,
          channelId: selection.channelId,
          title: args.caption,
          description: "",
          mediaUrl: args.urls[selection.format],
          format: selection.format,
          postState: "queue",
          scheduling: args.scheduling,
        });

        const post: ProviderPost = {
          format: selection.format,
          provider: "buffer",
          channelId: selection.channelId,
          ...(selection.channelName ? { channelName: selection.channelName } : {}),
          providerPostId: result.providerPostId,
          ...(dueAt ? { scheduledAt: dueAt } : {}),
        };
        const recordResult: { metadata: string } = await ctx.runMutation(
          internal.releases.recordScheduledProviderPost,
          {
            externalId,
            post,
          },
        );
        metadata = parseMetadata(recordResult.metadata);
        providerPosts = providerPostsFrom(metadata);
      } catch (err) {
        const errorClass =
          err && typeof err === "object" && "class" in err
            ? String((err as { class?: string }).class)
            : "unknown";
        const message = err instanceof Error ? err.message : String(err);
        await ctx.runMutation(internal.releases.markScheduledFailure, {
          externalId,
          error: { errorClass, message },
        });
        return { ok: false, error: "provider_failed", errorClass, message } as const;
      }
    }

    const scheduled = args.selections
      .map((selection) => findRecordedPost(providerPosts, selection))
      .filter((post): post is ProviderPost => !!post)
      .map((post) => ({
        format: post.format,
        channelId: post.channelId,
        ...(post.channelName ? { channelName: post.channelName } : {}),
        providerPostId: post.providerPostId,
        ...(post.scheduledAt ? { scheduledAt: post.scheduledAt } : {}),
      }));

    await ctx.runMutation(internal.releases.markScheduledSuccess, {
      externalId,
      metadata: JSON.stringify({ ...metadata, channels, providerPosts }),
    });

    return { ok: true, releaseId: externalId, scheduled } as const;
  },
});
