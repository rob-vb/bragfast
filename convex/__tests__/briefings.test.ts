// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "../schema";
import { api, internal } from "../_generated/api";

const modules = import.meta.glob("../**/*.*s");

const USER_ID = "user_briefing_001";
const OTHER_USER = "user_briefing_002";

const ISO_WEEK = "2026-W18";
const START_ISO = "2026-04-27T00:00:00.000Z";
const END_ISO = "2026-05-04T00:00:00.000Z";

const idempotencyKey = (userId: string, isoWeek: string) =>
  `${userId}:cron:weekly:${isoWeek}`;

describe("briefings.upsertWeeklyDraft", () => {
  it("creates a single draft, then patches on second call (idempotent)", async () => {
    const t = convexTest(schema, modules);

    const first = await t.mutation(internal.briefings.upsertWeeklyDraft, {
      userId: USER_ID,
      isoWeek: ISO_WEEK,
      name: "First name",
      config: JSON.stringify({ output: "image", notes: "first" }),
    });
    expect(first.created).toBe(true);

    const second = await t.mutation(internal.briefings.upsertWeeklyDraft, {
      userId: USER_ID,
      isoWeek: ISO_WEEK,
      name: "Second name",
      config: JSON.stringify({ output: "image", notes: "second" }),
    });
    expect(second.created).toBe(false);
    expect(second.id).toBe(first.id);

    const rows = await t.run(async (ctx) =>
      ctx.db
        .query("drafts")
        .withIndex("by_idempotencyKey", (q) =>
          q.eq("idempotencyKey", idempotencyKey(USER_ID, ISO_WEEK)),
        )
        .collect(),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe("Second name");
    expect(rows[0].config).toContain("second");
  });

  it("scopes idempotency keys per user", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.briefings.upsertWeeklyDraft, {
      userId: USER_ID,
      isoWeek: ISO_WEEK,
      name: "User A",
      config: JSON.stringify({ output: "image" }),
    });
    await t.mutation(internal.briefings.upsertWeeklyDraft, {
      userId: OTHER_USER,
      isoWeek: ISO_WEEK,
      name: "User B",
      config: JSON.stringify({ output: "image" }),
    });
    const rows = await t.run(async (ctx) =>
      ctx.db.query("drafts").collect(),
    );
    expect(rows).toHaveLength(2);
  });

  it("clears prior generationError when a successful upsert runs", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.briefings.markWeeklyDraftError, {
      userId: USER_ID,
      isoWeek: ISO_WEEK,
      error: "haiku rate limit",
    });
    await t.mutation(internal.briefings.upsertWeeklyDraft, {
      userId: USER_ID,
      isoWeek: ISO_WEEK,
      name: "Recovered",
      config: JSON.stringify({ output: "image" }),
    });
    const row = await t.run(async (ctx) =>
      ctx.db
        .query("drafts")
        .withIndex("by_idempotencyKey", (q) =>
          q.eq("idempotencyKey", idempotencyKey(USER_ID, ISO_WEEK)),
        )
        .first(),
    );
    expect(row?.generationError).toBeUndefined();
    expect(row?.name).toBe("Recovered");
  });
});

describe("briefings.markWeeklyDraftError", () => {
  it("creates a placeholder draft with generationError when none exists", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.briefings.markWeeklyDraftError, {
      userId: USER_ID,
      isoWeek: ISO_WEEK,
      error: "boom",
    });
    const row = await t.run(async (ctx) =>
      ctx.db
        .query("drafts")
        .withIndex("by_idempotencyKey", (q) =>
          q.eq("idempotencyKey", idempotencyKey(USER_ID, ISO_WEEK)),
        )
        .first(),
    );
    expect(row?.generationError).toBe("boom");
    expect(row?.sourceSystem).toBe("cron");
  });

  it("patches existing draft when one already exists", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.briefings.upsertWeeklyDraft, {
      userId: USER_ID,
      isoWeek: ISO_WEEK,
      name: "Healthy",
      config: JSON.stringify({ output: "image" }),
    });
    await t.mutation(internal.briefings.markWeeklyDraftError, {
      userId: USER_ID,
      isoWeek: ISO_WEEK,
      error: "later failure",
    });
    const rows = await t.run(async (ctx) =>
      ctx.db.query("drafts").collect(),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].generationError).toBe("later failure");
  });
});

describe("briefings.getWeeklyDraft", () => {
  it("returns null for unauthenticated callers", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.briefings.upsertWeeklyDraft, {
      userId: USER_ID,
      isoWeek: ISO_WEEK,
      name: "Hello",
      config: JSON.stringify({ output: "image" }),
    });
    const result = await t.query(api.briefings.getWeeklyDraft, {
      isoWeek: ISO_WEEK,
    });
    expect(result).toBeNull();
  });

  it("returns the draft for the owner", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.briefings.upsertWeeklyDraft, {
      userId: USER_ID,
      isoWeek: ISO_WEEK,
      name: "Hello",
      config: JSON.stringify({ output: "image" }),
    });
    const result = await t
      .withIdentity({ subject: USER_ID })
      .query(api.briefings.getWeeklyDraft, { isoWeek: ISO_WEEK });
    expect(result).not.toBeNull();
    expect(result?.name).toBe("Hello");
  });

  it("returns null for another user", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.briefings.upsertWeeklyDraft, {
      userId: USER_ID,
      isoWeek: ISO_WEEK,
      name: "Mine",
      config: JSON.stringify({ output: "image" }),
    });
    const result = await t
      .withIdentity({ subject: OTHER_USER })
      .query(api.briefings.getWeeklyDraft, { isoWeek: ISO_WEEK });
    expect(result).toBeNull();
  });
});

describe("briefings.triggerWeeklySummaryIfNeeded", () => {
  it("requires authentication", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(api.briefings.triggerWeeklySummaryIfNeeded, {
        isoWeek: ISO_WEEK,
        startISO: START_ISO,
        endISO: END_ISO,
      }),
    ).rejects.toThrow(/Unauthenticated/);
  });

  it("schedules generation when no draft exists yet", async () => {
    const t = convexTest(schema, modules);
    const result = await t
      .withIdentity({ subject: USER_ID })
      .mutation(api.briefings.triggerWeeklySummaryIfNeeded, {
        isoWeek: ISO_WEEK,
        startISO: START_ISO,
        endISO: END_ISO,
      });
    expect(result.scheduled).toBe(true);
    expect(result.externalId).toBeNull();
  });

  it("does not reschedule when a healthy draft already exists", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.briefings.upsertWeeklyDraft, {
      userId: USER_ID,
      isoWeek: ISO_WEEK,
      name: "Done",
      config: JSON.stringify({ output: "image" }),
    });
    const result = await t
      .withIdentity({ subject: USER_ID })
      .mutation(api.briefings.triggerWeeklySummaryIfNeeded, {
        isoWeek: ISO_WEEK,
        startISO: START_ISO,
        endISO: END_ISO,
      });
    expect(result.scheduled).toBe(false);
    expect(result.externalId).not.toBeNull();
  });

  it("reschedules when an errored draft exists (Regenerate path)", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.briefings.markWeeklyDraftError, {
      userId: USER_ID,
      isoWeek: ISO_WEEK,
      error: "previous failure",
    });
    const result = await t
      .withIdentity({ subject: USER_ID })
      .mutation(api.briefings.triggerWeeklySummaryIfNeeded, {
        isoWeek: ISO_WEEK,
        startISO: START_ISO,
        endISO: END_ISO,
      });
    expect(result.scheduled).toBe(true);
    expect(result.externalId).not.toBeNull();
  });
});
