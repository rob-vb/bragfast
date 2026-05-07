// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "../schema";
import { api } from "../_generated/api";

const modules = import.meta.glob("../**/*.*s");

const sampleConfig = {
  version: 2,
  formats: {
    landscape: { objects: [{ id: "title", type: "text" }] },
    square: { objects: [] },
    // portrait deliberately absent — DTO's `formats` should reflect that.
  },
  colors: { background: "#FFF8F0", text: "#1A1A1A", primary: "#F8AF3C" },
};

async function seed(t: ReturnType<typeof convexTest>) {
  await t.run(async (ctx) => {
    await ctx.db.insert("templates", {
      userId: "",
      externalId: "default-row",
      name: "Default Row",
      isDefault: true,
      medium: "both",
      visibility: "public",
      config: sampleConfig,
      previewUrls: {
        landscape: "https://r2/og/default-row-landscape.jpg",
        square: "https://r2/og/default-row-square.jpg",
        portrait: "https://r2/og/default-row-portrait.jpg",
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    await ctx.db.insert("templates", {
      userId: "author_001",
      externalId: "public-user-row",
      name: "Public User Row",
      isDefault: false,
      medium: "image",
      visibility: "public",
      authorUserId: "author_001",
      config: sampleConfig,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    await ctx.db.insert("templates", {
      userId: "author_002",
      externalId: "private-user-row",
      name: "Private User Row",
      isDefault: false,
      medium: "video",
      visibility: "private",
      config: sampleConfig,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  });
}

describe("listPublicTemplates DTO", () => {
  it("returns default + public-visibility rows; hides private rows", async () => {
    const t = convexTest(schema, modules);
    await seed(t);
    const rows = await t.query(api.templates.listPublicTemplates, {});
    const ids = rows.map((r) => r.externalId).sort();
    expect(ids).toEqual(["default-row", "public-user-row"]);
  });

  it("strips raw config and returns trimmed DTO fields only", async () => {
    const t = convexTest(schema, modules);
    await seed(t);
    const rows = await t.query(api.templates.listPublicTemplates, {});
    for (const row of rows) {
      expect(row).not.toHaveProperty("config");
      expect(row).toHaveProperty("externalId");
      expect(row).toHaveProperty("name");
      expect(row).toHaveProperty("medium");
      expect(row).toHaveProperty("formats");
      expect(row).toHaveProperty("palette");
    }
  });

  it("derives formats[] from config.formats keys (skips missing keys)", async () => {
    const t = convexTest(schema, modules);
    await seed(t);
    const row = (await t.query(api.templates.listPublicTemplates, {})).find(
      (r) => r.externalId === "default-row",
    );
    expect(row?.formats.sort()).toEqual(["landscape", "square"]);
  });

  it("derives palette from config.colors", async () => {
    const t = convexTest(schema, modules);
    await seed(t);
    const row = (await t.query(api.templates.listPublicTemplates, {})).find(
      (r) => r.externalId === "default-row",
    );
    expect(row?.palette).toEqual({
      background: "#FFF8F0",
      text: "#1A1A1A",
      primary: "#F8AF3C",
    });
  });

  it("anchors built-in medium to TEMPLATE_MEDIUMS even if DB row column is stale", async () => {
    // Regression: carousel-slide pre-existed in some envs without `medium`.
    // The DTO must report "image" from the in-process map, not "both" from the
    // missing column, so the public Library and kitchen gate stay consistent.
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert("templates", {
        userId: "",
        externalId: "carousel-slide",
        name: "Carousel slide",
        isDefault: true,
        // medium intentionally omitted — simulates a stale pre-seed row
        visibility: "public",
        config: sampleConfig,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    });
    const dto = await t.query(api.templates.getPublicTemplate, {
      externalId: "carousel-slide",
    });
    expect(dto?.medium).toBe("image");
  });
});

describe("getPublicTemplate DTO", () => {
  it("returns trimmed DTO without raw config for public row", async () => {
    const t = convexTest(schema, modules);
    await seed(t);
    const dto = await t.query(api.templates.getPublicTemplate, {
      externalId: "public-user-row",
    });
    expect(dto).not.toBeNull();
    expect(dto).not.toHaveProperty("config");
    expect(dto?.medium).toBe("image");
  });

  it("returns null for a private row", async () => {
    const t = convexTest(schema, modules);
    await seed(t);
    const dto = await t.query(api.templates.getPublicTemplate, {
      externalId: "private-user-row",
    });
    expect(dto).toBeNull();
  });

  it("returns null for missing externalId", async () => {
    const t = convexTest(schema, modules);
    await seed(t);
    const dto = await t.query(api.templates.getPublicTemplate, {
      externalId: "no-such-row",
    });
    expect(dto).toBeNull();
  });
});
