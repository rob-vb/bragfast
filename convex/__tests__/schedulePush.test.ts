// @vitest-environment edge-runtime
/// <reference types="vite/client" />

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import { makeFunctionReference } from "convex/server";
import schema from "../schema";
import { api } from "../_generated/api";

const modules = import.meta.glob("../**/*.*s");

vi.mock("../../src/lib/crypto/secret-box", () => ({
  open: (sealed: { ciphertext: string }) => sealed.ciphertext,
}));

vi.mock("../../src/lib/storage/r2", () => ({
  headObject: vi.fn(),
}));

vi.mock("../../src/lib/integrations/buffer/push", () => ({
  pushToBuffer: vi.fn(),
}));

import { headObject } from "../../src/lib/storage/r2";
import { pushToBuffer } from "../../src/lib/integrations/buffer/push";

const mockHeadObject = vi.mocked(headObject);
const mockPushToBuffer = vi.mocked(pushToBuffer);

const USER_ID = "user_schedule_001";
const DRAFT_ID = "drf_schedule_001";
const schedulePushRun = makeFunctionReference<
  "action",
  {
    userId: string;
    draftId: string;
    urls: Record<string, string>;
    keys: Record<string, string>;
    selections: Array<{
      format: "landscape" | "square" | "portrait";
      provider: "buffer";
      channelId: string;
      channelName?: string;
    }>;
    caption: string;
    scheduling: { type: "queue" } | { type: "custom"; scheduledAt: string };
  },
  | { ok: false; error: "upload_missing"; missing: string[] }
  | { ok: false; error: "buffer_not_connected" }
  | {
      ok: true;
      releaseId: string;
      scheduled: Array<{
        format: string;
        channelId: string;
        channelName?: string;
        providerPostId: string;
        scheduledAt?: string;
      }>;
    }
>("schedulePush:run");

const urls = {
  landscape: "https://cdn.example.com/releases/drf_schedule_001/landscape.jpg",
  square: "https://cdn.example.com/releases/drf_schedule_001/square.jpg",
  portrait: "https://cdn.example.com/releases/drf_schedule_001/portrait.jpg",
};

const keys = {
  landscape: "releases/drf_schedule_001/landscape.jpg",
  square: "releases/drf_schedule_001/square.jpg",
  portrait: "releases/drf_schedule_001/portrait.jpg",
};

const selections = [
  {
    format: "landscape" as const,
    provider: "buffer" as const,
    channelId: "ch_landscape",
    channelName: "Launch X",
  },
  {
    format: "square" as const,
    provider: "buffer" as const,
    channelId: "ch_square",
    channelName: "Launch LinkedIn",
  },
];

async function seedBufferSecret(t: ReturnType<typeof convexTest>) {
  await t.run(async (ctx) => {
    const now = new Date().toISOString();
    await ctx.db.insert("integrationSecrets", {
      userId: USER_ID,
      provider: "buffer",
      ciphertext: "buf_test_key",
      iv: "fake-iv",
      tag: "fake-tag",
      extra: JSON.stringify({
        organizationId: "org_1",
        channels: [
          { id: "ch_landscape", service: "twitter", displayName: "Launch X" },
          { id: "ch_square", service: "linkedin", displayName: "Launch LinkedIn" },
        ],
      }),
      enabled: true,
      created_at: now,
      updated_at: now,
    });
  });
}

async function listReleases(t: ReturnType<typeof convexTest>) {
  return t.query(api.releases.listByUser, { userId: USER_ID });
}

describe("schedulePush.run", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("returns upload_missing without pushing or inserting when any R2 key is missing", async () => {
    const t = convexTest(schema, modules);
    await seedBufferSecret(t);

    mockHeadObject.mockImplementation(async (key) =>
      key === keys.square ? null : { size: 123, contentType: "image/jpeg" },
    );

    const result = await t.action(schedulePushRun, {
      userId: USER_ID,
      draftId: DRAFT_ID,
      urls,
      keys,
      selections,
      caption: "We shipped scheduled posting.",
      scheduling: { type: "queue" },
    });

    expect(result).toEqual({
      ok: false,
      error: "upload_missing",
      missing: ["square"],
    });
    expect(mockHeadObject).toHaveBeenCalledTimes(3);
    expect(mockPushToBuffer).not.toHaveBeenCalled();
    expect(await listReleases(t)).toHaveLength(0);
  });

  it("pushes every selection and inserts a scheduled release", async () => {
    const t = convexTest(schema, modules);
    await seedBufferSecret(t);

    mockHeadObject.mockResolvedValue({ size: 123, contentType: "image/jpeg" });
    mockPushToBuffer
      .mockResolvedValueOnce({ providerPostId: "buf_post_landscape" })
      .mockResolvedValueOnce({ providerPostId: "buf_post_square" });

    const scheduling = {
      type: "custom" as const,
      scheduledAt: "2026-05-22T15:30:00.000Z",
    };
    const result = await t.action(schedulePushRun, {
      userId: USER_ID,
      draftId: DRAFT_ID,
      urls,
      keys,
      selections,
      caption: "We shipped scheduled posting.",
      scheduling,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.releaseId).toMatch(/^rel_/);
    expect(result.scheduled).toEqual([
      {
        format: "landscape",
        channelId: "ch_landscape",
        channelName: "Launch X",
        providerPostId: "buf_post_landscape",
        scheduledAt: scheduling.scheduledAt,
      },
      {
        format: "square",
        channelId: "ch_square",
        channelName: "Launch LinkedIn",
        providerPostId: "buf_post_square",
        scheduledAt: scheduling.scheduledAt,
      },
    ]);

    expect(mockPushToBuffer).toHaveBeenCalledTimes(2);
    expect(mockPushToBuffer).toHaveBeenNthCalledWith(1, {
      apiKey: "buf_test_key",
      channelId: "ch_landscape",
      title: "We shipped scheduled posting.",
      description: "",
      mediaUrl: urls.landscape,
      format: "landscape",
      postState: "queue",
      scheduling,
    });
    expect(mockPushToBuffer).toHaveBeenNthCalledWith(2, {
      apiKey: "buf_test_key",
      channelId: "ch_square",
      title: "We shipped scheduled posting.",
      description: "",
      mediaUrl: urls.square,
      format: "square",
      postState: "queue",
      scheduling,
    });

    const releases = await listReleases(t);
    expect(releases).toHaveLength(1);
    expect(releases[0]).toMatchObject({
      userId: USER_ID,
      externalId: result.releaseId,
      template: "local-render",
      status: "scheduled",
      output: "image",
      credits_used: 0,
      images: urls,
      socialCopy: JSON.stringify({ caption: "We shipped scheduled posting." }),
    });
    const metadata = JSON.parse(releases[0].metadata ?? "{}");
    expect(metadata).toMatchObject({
      draftId: DRAFT_ID,
      scheduling: { type: "custom", scheduledAt: scheduling.scheduledAt },
      channels: [
        {
          format: "landscape",
          provider: "buffer",
          channelId: "ch_landscape",
          channelName: "Launch X",
        },
        {
          format: "square",
          provider: "buffer",
          channelId: "ch_square",
          channelName: "Launch LinkedIn",
        },
      ],
      providerPosts: [
        {
          format: "landscape",
          provider: "buffer",
          channelId: "ch_landscape",
          channelName: "Launch X",
          providerPostId: "buf_post_landscape",
          scheduledAt: scheduling.scheduledAt,
        },
        {
          format: "square",
          provider: "buffer",
          channelId: "ch_square",
          channelName: "Launch LinkedIn",
          providerPostId: "buf_post_square",
          scheduledAt: scheduling.scheduledAt,
        },
      ],
    });
  });

  it("returns buffer_not_connected when the Buffer secret is missing", async () => {
    const t = convexTest(schema, modules);

    mockHeadObject.mockResolvedValue({ size: 123, contentType: "image/jpeg" });

    const result = await t.action(schedulePushRun, {
      userId: USER_ID,
      draftId: DRAFT_ID,
      urls,
      keys,
      selections: [selections[0]],
      caption: "We shipped scheduled posting.",
      scheduling: { type: "queue" },
    });

    expect(result).toEqual({ ok: false, error: "buffer_not_connected" });
    expect(mockPushToBuffer).not.toHaveBeenCalled();
    expect(await listReleases(t)).toHaveLength(0);
  });
});
