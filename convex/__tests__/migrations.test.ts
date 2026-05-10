// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "../schema";
import { internal } from "../_generated/api";

const modules = import.meta.glob("../**/*.*s");

const sampleConfig = {
  version: 2,
  formats: { landscape: { objects: [] } },
  colors: { background: "#fff", text: "#000", primary: "#abc" },
};

async function insertRow(
  t: ReturnType<typeof convexTest>,
  row: {
    externalId: string;
    isDefault: boolean;
    medium?: "image" | "video" | "both";
    visibility?: "public" | "private";
  },
) {
  await t.run(async (ctx) => {
    await ctx.db.insert("templates", {
      userId: row.isDefault ? "" : "user_mig_001",
      externalId: row.externalId,
      name: row.externalId,
      isDefault: row.isDefault,
      config: sampleConfig,
      ...(row.medium ? { medium: row.medium } : {}),
      ...(row.visibility ? { visibility: row.visibility } : {}),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  });
}

describe("backfillTemplateMediumAndVisibility", () => {
  it("patches user rows missing medium and visibility", async () => {
    const t = convexTest(schema, modules);
    await insertRow(t, { externalId: "tmpl_user_old_a", isDefault: false });

    const result = await t.mutation(
      internal.migrations.backfillTemplateMediumAndVisibility,
      {},
    );
    expect(result.scanned).toBe(1);
    expect(result.patched).toBe(1);

    const row = await t.run(async (ctx) =>
      ctx.db
        .query("templates")
        .withIndex("by_externalId", (q) => q.eq("externalId", "tmpl_user_old_a"))
        .unique(),
    );
    expect(row?.medium).toBe("both");
    expect(row?.visibility).toBe("private");
  });

  it("is idempotent — running twice patches zero rows on the second pass", async () => {
    const t = convexTest(schema, modules);
    await insertRow(t, { externalId: "tmpl_user_old_b", isDefault: false });

    const first = await t.mutation(
      internal.migrations.backfillTemplateMediumAndVisibility,
      {},
    );
    expect(first.patched).toBe(1);

    const second = await t.mutation(
      internal.migrations.backfillTemplateMediumAndVisibility,
      {},
    );
    expect(second.patched).toBe(0);
    expect(second.scanned).toBe(1);
  });

  it("skips default rows entirely (defaults are managed by seedDefaults)", async () => {
    const t = convexTest(schema, modules);
    await insertRow(t, { externalId: "tmpl_default_x", isDefault: true });

    const result = await t.mutation(
      internal.migrations.backfillTemplateMediumAndVisibility,
      {},
    );
    expect(result.scanned).toBe(0);
    expect(result.patched).toBe(0);
  });

  it("preserves explicit medium/visibility values", async () => {
    const t = convexTest(schema, modules);
    await insertRow(t, {
      externalId: "tmpl_user_set",
      isDefault: false,
      medium: "video",
      visibility: "public",
    });

    await t.mutation(
      internal.migrations.backfillTemplateMediumAndVisibility,
      {},
    );

    const row = await t.run(async (ctx) =>
      ctx.db
        .query("templates")
        .withIndex("by_externalId", (q) => q.eq("externalId", "tmpl_user_set"))
        .unique(),
    );
    expect(row?.medium).toBe("video");
    expect(row?.visibility).toBe("public");
  });
});
