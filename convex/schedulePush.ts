"use node";

import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
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
  },
  handler: async (ctx, args) => {
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
    const scheduled: ScheduledPost[] = [];
    const dueAt = scheduledAtFor(args.scheduling);

    for (const selection of args.selections) {
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

      scheduled.push({
        format: selection.format,
        channelId: selection.channelId,
        ...(selection.channelName ? { channelName: selection.channelName } : {}),
        providerPostId: result.providerPostId,
        ...(dueAt ? { scheduledAt: dueAt } : {}),
      });
    }

    const releaseId = `rel_${crypto.randomUUID().slice(0, 12)}`;
    const channels = args.selections.map((selection) => ({
      format: selection.format,
      provider: selection.provider,
      channelId: selection.channelId,
      ...(selection.channelName ? { channelName: selection.channelName } : {}),
    }));
    const providerPosts = scheduled.map((post) => ({
      format: post.format,
      provider: "buffer" as const,
      channelId: post.channelId,
      ...(post.channelName ? { channelName: post.channelName } : {}),
      providerPostId: post.providerPostId,
      ...(post.scheduledAt ? { scheduledAt: post.scheduledAt } : {}),
    }));

    await ctx.runMutation(internal.releases.insertScheduled, {
      userId: args.userId,
      externalId: releaseId,
      template: "local-render",
      images: args.urls,
      socialCopy: JSON.stringify({ caption: args.caption }),
      metadata: JSON.stringify({
        draftId: args.draftId,
        scheduling: args.scheduling,
        channels,
        providerPosts,
      }),
    });

    return { ok: true, releaseId, scheduled } as const;
  },
});
