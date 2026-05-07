// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "../schema";
import { api } from "../_generated/api";

const modules = import.meta.glob("../**/*.*s");

const PUBLIC_SOURCE = "tmpl_pub_src_001";
const PRIVATE_SOURCE = "tmpl_priv_src_001";
const USER = "user_import_001";

const sampleConfig = {
  version: 2,
  formats: {
    landscape: { objects: [] },
    square: { objects: [] },
    portrait: { objects: [] },
  },
  colors: { background: "#fff", text: "#000", primary: "#abc" },
};

async function seedSources(t: ReturnType<typeof convexTest>) {
  await t.run(async (ctx) => {
    await ctx.db.insert("templates", {
      userId: "author_001",
      externalId: PUBLIC_SOURCE,
      name: "Public Source",
      isDefault: false,
      visibility: "public",
      medium: "image",
      authorUserId: "author_001",
      config: sampleConfig,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    await ctx.db.insert("templates", {
      userId: "author_002",
      externalId: PRIVATE_SOURCE,
      name: "Private Source",
      isDefault: false,
      visibility: "private",
      medium: "both",
      authorUserId: "author_002",
      config: sampleConfig,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  });
}

describe("importTemplate", () => {
  it("creates a private copy with importedFromTemplateId set", async () => {
    const t = convexTest(schema, modules);
    await seedSources(t);

    const result = await t.mutation(api.templates.importTemplate, {
      sourceExternalId: PUBLIC_SOURCE,
      userId: USER,
      externalId: "tmpl_imported_a",
    });

    expect(result.alreadyImported).toBe(false);
    expect(result.id).toBe("tmpl_imported_a");
    expect(result.visibility).toBe("private");
    expect(result.importedFromTemplateId).toBe(PUBLIC_SOURCE);
    expect(result.medium).toBe("image");
  });

  it("is idempotent — second import returns existing row with alreadyImported=true", async () => {
    const t = convexTest(schema, modules);
    await seedSources(t);

    const first = await t.mutation(api.templates.importTemplate, {
      sourceExternalId: PUBLIC_SOURCE,
      userId: USER,
      externalId: "tmpl_imported_b1",
    });
    expect(first.alreadyImported).toBe(false);

    const second = await t.mutation(api.templates.importTemplate, {
      sourceExternalId: PUBLIC_SOURCE,
      userId: USER,
      externalId: "tmpl_imported_b2",
    });
    expect(second.alreadyImported).toBe(true);
    expect(second.id).toBe(first.id);
  });

  it("rejects import of a private (non-public, non-default) source", async () => {
    const t = convexTest(schema, modules);
    await seedSources(t);

    await expect(
      t.mutation(api.templates.importTemplate, {
        sourceExternalId: PRIVATE_SOURCE,
        userId: USER,
        externalId: "tmpl_imported_c",
      }),
    ).rejects.toThrow(/not public/i);
  });

  it("rejects import of a missing source", async () => {
    const t = convexTest(schema, modules);
    await seedSources(t);

    await expect(
      t.mutation(api.templates.importTemplate, {
        sourceExternalId: "tmpl_does_not_exist",
        userId: USER,
        externalId: "tmpl_imported_d",
      }),
    ).rejects.toThrow(/not found/i);
  });

  it("preserves source authorUserId on the imported copy", async () => {
    const t = convexTest(schema, modules);
    await seedSources(t);

    const result = await t.mutation(api.templates.importTemplate, {
      sourceExternalId: PUBLIC_SOURCE,
      userId: USER,
      externalId: "tmpl_imported_e",
    });
    expect(result.alreadyImported).toBe(false);

    const row = await t.run(async (ctx) =>
      ctx.db
        .query("templates")
        .withIndex("by_externalId", (q) => q.eq("externalId", "tmpl_imported_e"))
        .unique(),
    );
    expect(row?.authorUserId).toBe("author_001");
  });
});
