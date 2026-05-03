// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "../schema";
import { api, internal } from "../_generated/api";

const modules = import.meta.glob("../**/*.*s");

const USER_ID = "user_trigger_001";
const OTHER_USER = "user_trigger_002";

describe("triggerEvents.record + listByUser", () => {
  it("records a row and surfaces it newest-first", async () => {
    const t = convexTest(schema, modules);

    await t.mutation(internal.triggerEvents.record, {
      userId: USER_ID,
      sourceSystem: "github",
      triggerType: "pr_merged",
      decision: "auto_skipped",
      reason: "content_filter",
      sourceReference: "https://github.com/rob/test/pull/1",
    });
    // Slight delay so created_at strings differ.
    await new Promise((r) => setTimeout(r, 5));
    await t.mutation(internal.triggerEvents.record, {
      userId: USER_ID,
      sourceSystem: "github",
      triggerType: "pr_merged",
      decision: "drafted",
      confidence: 0.7,
      sourceReference: "https://github.com/rob/test/pull/2",
    });

    const rows = await t
      .withIdentity({ subject: USER_ID })
      .query(api.triggerEvents.listByUser, {});
    expect(rows).toHaveLength(2);
    expect(rows[0].decision).toBe("drafted");
    expect(rows[0].confidence).toBe(0.7);
    expect(rows[1].decision).toBe("auto_skipped");
    expect(rows[1].reason).toBe("content_filter");
  });

  it("scopes the feed to the authed user", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.triggerEvents.record, {
      userId: USER_ID,
      sourceSystem: "github",
      triggerType: "pr_merged",
      decision: "drafted",
    });
    await t.mutation(internal.triggerEvents.record, {
      userId: OTHER_USER,
      sourceSystem: "github",
      triggerType: "pr_merged",
      decision: "drafted",
    });

    const mine = await t
      .withIdentity({ subject: USER_ID })
      .query(api.triggerEvents.listByUser, {});
    expect(mine).toHaveLength(1);
  });

  it("respects the optional limit", async () => {
    const t = convexTest(schema, modules);
    for (let i = 0; i < 5; i++) {
      await t.mutation(internal.triggerEvents.record, {
        userId: USER_ID,
        sourceSystem: "manual",
        triggerType: "test",
        decision: "drafted",
      });
    }
    const rows = await t
      .withIdentity({ subject: USER_ID })
      .query(api.triggerEvents.listByUser, { limit: 2 });
    expect(rows).toHaveLength(2);
  });

  it("listByUser returns [] when unauthenticated (silent first-paint flicker)", async () => {
    const t = convexTest(schema, modules);
    const rows = await t.query(api.triggerEvents.listByUser, {});
    expect(rows).toEqual([]);
  });
});

describe("drafts.remove records user_skipped for agent drafts", () => {
  it("emits user_skipped event when source=agent", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert("drafts", {
        userId: USER_ID,
        externalId: "drf_skip_agent",
        source: "agent",
        sourceSystem: "github",
        milestoneKey: "pr_merged:rob/test#9",
        eventReference: "https://github.com/rob/test/pull/9",
        confidence: 0.4,
        config: JSON.stringify({ output: "image" }),
        created_at: new Date().toISOString(),
      });
    });

    await t.mutation(api.drafts.remove, {
      externalId: "drf_skip_agent",
      userId: USER_ID,
    });

    const events = await t
      .withIdentity({ subject: USER_ID })
      .query(api.triggerEvents.listByUser, {});
    expect(events).toHaveLength(1);
    expect(events[0].decision).toBe("user_skipped");
    expect(events[0].triggerType).toBe("pr_merged");
    expect(events[0].draftExternalId).toBe("drf_skip_agent");
    expect(events[0].sourceReference).toBe(
      "https://github.com/rob/test/pull/9",
    );
  });

  it("does not emit a trigger event when source=user", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert("drafts", {
        userId: USER_ID,
        externalId: "drf_skip_user",
        source: "user",
        config: JSON.stringify({ output: "image" }),
        created_at: new Date().toISOString(),
      });
    });

    await t.mutation(api.drafts.remove, {
      externalId: "drf_skip_user",
      userId: USER_ID,
    });

    const events = await t
      .withIdentity({ subject: USER_ID })
      .query(api.triggerEvents.listByUser, {});
    expect(events).toHaveLength(0);
  });
});

describe("listByUserForDay / listByUserForWeek", () => {
  it("returns [] unauthenticated and scopes by window", async () => {
    const t = convexTest(schema, modules);
    // Two events: one inside the window, one outside.
    await t.run(async (ctx) => {
      await ctx.db.insert("triggerEvents", {
        userId: USER_ID,
        externalId: "evt_in",
        sourceSystem: "github",
        triggerType: "pr_merged",
        decision: "drafted",
        created_at: "2026-05-03T10:00:00.000Z",
      });
      await ctx.db.insert("triggerEvents", {
        userId: USER_ID,
        externalId: "evt_out",
        sourceSystem: "github",
        triggerType: "pr_merged",
        decision: "drafted",
        created_at: "2026-04-01T10:00:00.000Z",
      });
    });

    // Unauthenticated → [].
    const empty = await t.query(api.triggerEvents.listByUserForDay, {
      startISO: "2026-05-03T00:00:00.000Z",
      endISO: "2026-05-04T00:00:00.000Z",
    });
    expect(empty).toEqual([]);

    // Authed: only the in-window row comes back.
    const day = await t
      .withIdentity({ subject: USER_ID })
      .query(api.triggerEvents.listByUserForDay, {
        startISO: "2026-05-03T00:00:00.000Z",
        endISO: "2026-05-04T00:00:00.000Z",
      });
    expect(day).toHaveLength(1);
    expect(day[0].id).toBe("evt_in");

    // Week window catches the same row.
    const week = await t
      .withIdentity({ subject: USER_ID })
      .query(api.triggerEvents.listByUserForWeek, {
        startISO: "2026-04-27T00:00:00.000Z",
        endISO: "2026-05-04T00:00:00.000Z",
      });
    expect(week).toHaveLength(1);
  });

  it("scopes to the calling user", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert("triggerEvents", {
        userId: USER_ID,
        externalId: "evt_a",
        sourceSystem: "github",
        triggerType: "pr_merged",
        decision: "drafted",
        created_at: "2026-05-03T10:00:00.000Z",
      });
      await ctx.db.insert("triggerEvents", {
        userId: OTHER_USER,
        externalId: "evt_b",
        sourceSystem: "github",
        triggerType: "pr_merged",
        decision: "drafted",
        created_at: "2026-05-03T11:00:00.000Z",
      });
    });
    const rows = await t
      .withIdentity({ subject: USER_ID })
      .query(api.triggerEvents.listByUserForDay, {
        startISO: "2026-05-03T00:00:00.000Z",
        endISO: "2026-05-04T00:00:00.000Z",
      });
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe("evt_a");
  });
});

describe("countUnseenBriefingDrafts + markBriefingSeen", () => {
  it("counts only `drafted` events created after lastBriefingVisitAt", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert("userProfiles", {
        userId: USER_ID,
        plan: "free",
        creditsRemaining: 0,
        lastBriefingVisitAt: new Date("2026-05-01T00:00:00.000Z").getTime(),
      });
      // Inserted before last visit → not counted.
      await ctx.db.insert("triggerEvents", {
        userId: USER_ID,
        externalId: "evt_old",
        sourceSystem: "github",
        triggerType: "pr_merged",
        decision: "drafted",
        created_at: "2026-04-30T00:00:00.000Z",
      });
      // After last visit, but auto_skipped → not counted.
      await ctx.db.insert("triggerEvents", {
        userId: USER_ID,
        externalId: "evt_skipped",
        sourceSystem: "github",
        triggerType: "pr_merged",
        decision: "auto_skipped",
        created_at: "2026-05-02T00:00:00.000Z",
      });
      // After last visit + drafted → counted.
      await ctx.db.insert("triggerEvents", {
        userId: USER_ID,
        externalId: "evt_new1",
        sourceSystem: "github",
        triggerType: "pr_merged",
        decision: "drafted",
        created_at: "2026-05-02T01:00:00.000Z",
      });
      await ctx.db.insert("triggerEvents", {
        userId: USER_ID,
        externalId: "evt_new2",
        sourceSystem: "github",
        triggerType: "pr_merged",
        decision: "drafted",
        created_at: "2026-05-02T02:00:00.000Z",
      });
    });

    const count = await t
      .withIdentity({ subject: USER_ID })
      .query(api.triggerEvents.countUnseenBriefingDrafts, {});
    expect(count).toBe(2);
  });

  it("returns 0 unauthenticated", async () => {
    const t = convexTest(schema, modules);
    const count = await t.query(
      api.triggerEvents.countUnseenBriefingDrafts,
      {},
    );
    expect(count).toBe(0);
  });

  it("markBriefingSeen advances lastBriefingVisitAt to clear the count", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert("userProfiles", {
        userId: USER_ID,
        plan: "free",
        creditsRemaining: 0,
      });
      await ctx.db.insert("triggerEvents", {
        userId: USER_ID,
        externalId: "evt_pre",
        sourceSystem: "github",
        triggerType: "pr_merged",
        decision: "drafted",
        created_at: new Date(Date.now() - 60_000).toISOString(),
      });
    });

    const asUser = t.withIdentity({ subject: USER_ID });
    expect(
      await asUser.query(api.triggerEvents.countUnseenBriefingDrafts, {}),
    ).toBe(1);
    await asUser.mutation(api.triggerEvents.markBriefingSeen, {});
    expect(
      await asUser.query(api.triggerEvents.countUnseenBriefingDrafts, {}),
    ).toBe(0);
  });
});

describe("approveDraft records approved event", () => {
  it("emits an approved row tied to the draft", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert("drafts", {
        userId: USER_ID,
        externalId: "drf_approve",
        source: "agent",
        sourceSystem: "github",
        milestoneKey: "pr_merged:rob/test#3",
        eventReference: "https://github.com/rob/test/pull/3",
        confidence: 0.85,
        config: JSON.stringify({ output: "image" }),
        created_at: new Date().toISOString(),
      });
      await ctx.db.insert("integrationSecrets", {
        userId: USER_ID,
        provider: "buffer",
        ciphertext: "x",
        iv: "x",
        tag: "x",
        extra: JSON.stringify({
          channels: [{ id: "ch_x", service: "twitter", displayName: "X" }],
        }),
        enabled: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    });

    const res = await t
      .withIdentity({ subject: USER_ID })
      .mutation(api.draftPushes.approveDraft, {
        draftId: "drf_approve",
        title: "T",
        description: "D",
        selections: [
          { format: "landscape", provider: "buffer", channelId: "ch_x" },
        ],
        postState: "queue",
        clientNonce: "nonce_approve_1",
      });
    expect(res.ok).toBe(true);

    const events = await t
      .withIdentity({ subject: USER_ID })
      .query(api.triggerEvents.listByUser, {});
    expect(events).toHaveLength(1);
    expect(events[0].decision).toBe("approved");
    expect(events[0].draftExternalId).toBe("drf_approve");
    expect(events[0].triggerType).toBe("pr_merged");
    expect(events[0].confidence).toBe(0.85);
  });
});
