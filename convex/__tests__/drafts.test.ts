// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "../schema";
import { api } from "../_generated/api";

const modules = import.meta.glob("../**/*.*s");

const USER_ID = "user_drafts_001";
const OTHER_USER = "user_drafts_002";

function setupT() {
  return {
    t: convexTest(schema, modules),
    asUser: convexTest(schema, modules).withIdentity({ subject: USER_ID }),
  };
}

async function seedSuppressedDraft(externalId: string) {
  const t = convexTest(schema, modules);
  await t.run(async (ctx) => {
    await ctx.db.insert("drafts", {
      userId: USER_ID,
      externalId,
      source: "agent",
      createdBy: "sous-chef",
      config: JSON.stringify({ output: "image" }),
      sourceSystem: "github",
      milestoneKey: "pr_merged:rob/test#1",
      idempotencyKey: `${USER_ID}:github:pr_merged:rob/test#1`,
      confidence: 0.2,
      suppressed: true,
      created_at: new Date().toISOString(),
    });
  });
  return t;
}

describe("unsuppressDraft", () => {
  it("flips suppressed → false for the owner", async () => {
    const t = await seedSuppressedDraft("drf_unsup1");
    const asUser = t.withIdentity({ subject: USER_ID });

    const res = await asUser.mutation(api.drafts.unsuppressDraft, {
      externalId: "drf_unsup1",
    });
    expect(res).toBe(true);

    const row = await asUser.query(api.drafts.getByExternalId, {
      externalId: "drf_unsup1",
      userId: USER_ID,
    });
    expect(row?.suppressed).toBe(false);
  });

  it("rejects another user's draft", async () => {
    const t = await seedSuppressedDraft("drf_unsup2");
    const asOther = t.withIdentity({ subject: OTHER_USER });

    const res = await asOther.mutation(api.drafts.unsuppressDraft, {
      externalId: "drf_unsup2",
    });
    expect(res).toBe(false);
  });

  it("requires authentication", async () => {
    const t = await seedSuppressedDraft("drf_unsup3");
    await expect(
      t.mutation(api.drafts.unsuppressDraft, {
        externalId: "drf_unsup3",
      }),
    ).rejects.toThrow(/Unauthenticated/);
  });
});

describe("listByUser exposes confidence + suppressed", () => {
  it("returns confidence and suppressed on each row", async () => {
    const t = await seedSuppressedDraft("drf_list1");
    const asUser = t.withIdentity({ subject: USER_ID });

    const rows = await asUser.query(api.drafts.listByUser, { userId: USER_ID });
    expect(rows).toHaveLength(1);
    expect(rows[0].confidence).toBe(0.2);
    expect(rows[0].suppressed).toBe(true);
  });

  it("defaults suppressed to false when missing", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert("drafts", {
        userId: USER_ID,
        externalId: "drf_legacy",
        source: "agent",
        config: JSON.stringify({ output: "image" }),
        created_at: new Date().toISOString(),
      });
    });
    const rows = await t
      .withIdentity({ subject: USER_ID })
      .query(api.drafts.listByUser, { userId: USER_ID });
    expect(rows[0].suppressed).toBe(false);
    expect(rows[0].confidence).toBe(null);
  });
});

describe("getByExternalIdAuthed", () => {
  it("returns null unauthenticated", async () => {
    const t = await seedSuppressedDraft("drf_authed1");
    const row = await t.query(api.drafts.getByExternalIdAuthed, {
      externalId: "drf_authed1",
    });
    expect(row).toBeNull();
  });

  it("returns the draft for the owner", async () => {
    const t = await seedSuppressedDraft("drf_authed2");
    const row = await t
      .withIdentity({ subject: USER_ID })
      .query(api.drafts.getByExternalIdAuthed, { externalId: "drf_authed2" });
    expect(row).not.toBeNull();
    expect(row?.id).toBe("drf_authed2");
  });

  it("returns null when another user is authed", async () => {
    const t = await seedSuppressedDraft("drf_authed3");
    const row = await t
      .withIdentity({ subject: OTHER_USER })
      .query(api.drafts.getByExternalIdAuthed, { externalId: "drf_authed3" });
    expect(row).toBeNull();
  });

  it("surfaces generationError when present", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert("drafts", {
        userId: USER_ID,
        externalId: "drf_err",
        source: "agent",
        config: JSON.stringify({ output: "image" }),
        generationError: "haiku timeout",
        created_at: new Date().toISOString(),
      });
    });
    const row = await t
      .withIdentity({ subject: USER_ID })
      .query(api.drafts.getByExternalIdAuthed, { externalId: "drf_err" });
    expect(row?.generationError).toBe("haiku timeout");
  });
});

// silence unused-import lint for setupT (kept for symmetry with other test files)
void setupT;
