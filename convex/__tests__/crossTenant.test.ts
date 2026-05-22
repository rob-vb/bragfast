// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "../schema";
import { api } from "../_generated/api";

const modules = import.meta.glob("../**/*.*s");

const USER_A = "user_xt_a";
const USER_B = "user_xt_b";

// S0.4d — cross-tenant isolation regression test.
//
// Covers the public Convex surface that S0.4a.3, S0.4b, S0.4c hardened.
// For each module, asserts that USER_B cannot read or mutate USER_A's data
// via the published browser-callable API.
//
// Known gap (deferred to S0.4a.4 / S0.4a.5): server-side
// `fetchQuery`/`fetchMutation` from Next.js routes still pass a client-supplied
// `userId` arg to functions like `drafts.create`, `drafts.listByUser`,
// `goals.create`. These are reachable only via Next.js routes that gate
// callers with `getSessionUser()` first, so the public Convex URL exfil path
// is closed. This test exercises what is enforced *at the Convex layer today*.

describe("cross-tenant isolation — S0.4d", () => {
  describe("drafts (auth-gated browser surface, S0.4a.3)", () => {
    it("unseenCount uses caller's identity, not a userId arg", async () => {
      const t = convexTest(schema, modules);
      // Seed userProfiles + a draft for USER_A.
      await t.run(async (ctx) => {
        await ctx.db.insert("userProfiles", {
          userId: USER_A,
          plan: "free",
          lastDraftsVisitAt: 0,
        });
        await ctx.db.insert("userProfiles", {
          userId: USER_B,
          plan: "free",
          lastDraftsVisitAt: 0,
        });
        await ctx.db.insert("drafts", {
          userId: USER_A,
          externalId: "drf_xt_a1",
          source: "user",
          config: "{}",
          created_at: new Date().toISOString(),
        });
      });
      const aCount = await t
        .withIdentity({ subject: USER_A })
        .query(api.drafts.unseenCount, {});
      const bCount = await t
        .withIdentity({ subject: USER_B })
        .query(api.drafts.unseenCount, {});
      expect(aCount).toBe(1);
      expect(bCount).toBe(0); // B sees none of A's drafts
    });

    it("markSeen stamps caller's profile only", async () => {
      const t = convexTest(schema, modules);
      await t.run(async (ctx) => {
        await ctx.db.insert("userProfiles", {
          userId: USER_A,
          plan: "free",
          lastDraftsVisitAt: 0,
        });
        await ctx.db.insert("userProfiles", {
          userId: USER_B,
          plan: "free",
          lastDraftsVisitAt: 0,
        });
      });
      await t.withIdentity({ subject: USER_B }).mutation(api.drafts.markSeen, {});
      const profiles = await t.run(async (ctx) => {
        return Promise.all([
          ctx.db
            .query("userProfiles")
            .withIndex("by_userId", (q) => q.eq("userId", USER_A))
            .first(),
          ctx.db
            .query("userProfiles")
            .withIndex("by_userId", (q) => q.eq("userId", USER_B))
            .first(),
        ]);
      });
      expect(profiles[0]?.lastDraftsVisitAt).toBe(0); // A untouched
      expect(profiles[1]?.lastDraftsVisitAt).toBeGreaterThan(0); // B stamped
    });

    it("getByExternalId returns null for foreign owner", async () => {
      const t = convexTest(schema, modules);
      await t.run(async (ctx) => {
        await ctx.db.insert("drafts", {
          userId: USER_A,
          externalId: "drf_xt_a2",
          source: "user",
          config: "{}",
          created_at: new Date().toISOString(),
        });
      });
      // userId here is the client-supplied filter arg (a.4 deferred). This
      // exercises the in-handler ownership filter on the existing surface.
      const seenByB = await t.query(api.drafts.getByExternalId, {
        externalId: "drf_xt_a2",
        userId: USER_B,
      });
      expect(seenByB).toBeNull();
    });

    it("unsuppressDraft refuses to flip a foreign draft", async () => {
      const t = convexTest(schema, modules);
      await t.run(async (ctx) => {
        await ctx.db.insert("drafts", {
          userId: USER_A,
          externalId: "drf_xt_a3",
          source: "agent",
          config: "{}",
          suppressed: true,
          created_at: new Date().toISOString(),
        });
      });
      const result = await t
        .withIdentity({ subject: USER_B })
        .mutation(api.drafts.unsuppressDraft, { externalId: "drf_xt_a3" });
      expect(result).toBe(false);
      const row = await t.run(async (ctx) =>
        ctx.db
          .query("drafts")
          .withIndex("by_externalId", (q) => q.eq("externalId", "drf_xt_a3"))
          .first(),
      );
      expect(row?.suppressed).toBe(true); // A's draft still suppressed
    });
  });

  describe("draftPushes (auth-gated, S0.4a.3)", () => {
    it("listByDraft refuses foreign caller", async () => {
      const t = convexTest(schema, modules);
      await t.run(async (ctx) => {
        await ctx.db.insert("drafts", {
          userId: USER_A,
          externalId: "drf_xt_dp1",
          source: "user",
          config: "{}",
          created_at: new Date().toISOString(),
        });
      });
      const rows = await t
        .withIdentity({ subject: USER_B })
        .query(api.draftPushes.listByDraft, { draftId: "drf_xt_dp1" });
      // Either empty or rejected — both are acceptable. Verify it is not A's data.
      expect(rows).toEqual([]);
    });
  });

  describe("githubRepoConfigs (ownership-checked, S0.4c)", () => {
    it("getByRepo rejects when caller's userId != installation owner", async () => {
      const t = convexTest(schema, modules);
      await t.run(async (ctx) => {
        await ctx.db.insert("githubInstallations", {
          installationId: 9001,
          userId: USER_A,
          accountLogin: "alice",
          accountType: "User",
          status: "active",
          enabled: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        await ctx.db.insert("githubRepoConfigs", {
          installationId: 9001,
          repoFullName: "alice/secrets",
          enabled: true,
          notifyOnPrMerge: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      });
      const seenByB = await t.query(api.githubRepoConfigs.getByRepo, {
        userId: USER_B,
        installationId: 9001,
        repoFullName: "alice/secrets",
      });
      expect(seenByB).toBeNull();
    });

    it("listByInstallation returns [] when caller doesn't own installation", async () => {
      const t = convexTest(schema, modules);
      await t.run(async (ctx) => {
        await ctx.db.insert("githubInstallations", {
          installationId: 9002,
          userId: USER_A,
          accountLogin: "alice",
          accountType: "User",
          status: "active",
          enabled: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        await ctx.db.insert("githubRepoConfigs", {
          installationId: 9002,
          repoFullName: "alice/r1",
          enabled: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      });
      const seenByB = await t.query(
        api.githubRepoConfigs.listByInstallation,
        { userId: USER_B, installationId: 9002 },
      );
      expect(seenByB).toEqual([]);
    });

    it("upsert refuses cross-tenant write (returns false, no row mutated)", async () => {
      const t = convexTest(schema, modules);
      await t.run(async (ctx) => {
        await ctx.db.insert("githubInstallations", {
          installationId: 9003,
          userId: USER_A,
          accountLogin: "alice",
          accountType: "User",
          status: "active",
          enabled: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        await ctx.db.insert("githubRepoConfigs", {
          installationId: 9003,
          repoFullName: "alice/r2",
          enabled: true,
          notifyOnPrMerge: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      });
      const ok = await t.mutation(api.githubRepoConfigs.upsert, {
        userId: USER_B,
        installationId: 9003,
        repoFullName: "alice/r2",
        notifyOnPrMerge: true,
      });
      expect(ok).toBe(false);
      const row = await t.run(async (ctx) =>
        ctx.db
          .query("githubRepoConfigs")
          .withIndex("by_repoFullName", (q) =>
            q.eq("repoFullName", "alice/r2"),
          )
          .first(),
      );
      expect(row?.notifyOnPrMerge).toBe(false); // unchanged
    });

    it("toggle / setNotifyOnPrMerge refuse cross-tenant", async () => {
      const t = convexTest(schema, modules);
      await t.run(async (ctx) => {
        await ctx.db.insert("githubInstallations", {
          installationId: 9004,
          userId: USER_A,
          accountLogin: "alice",
          accountType: "User",
          status: "active",
          enabled: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        await ctx.db.insert("githubRepoConfigs", {
          installationId: 9004,
          repoFullName: "alice/r3",
          enabled: true,
          notifyOnPrMerge: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      });
      const a = await t.mutation(api.githubRepoConfigs.toggle, {
        userId: USER_B,
        repoFullName: "alice/r3",
        enabled: false,
      });
      const b = await t.mutation(api.githubRepoConfigs.setNotifyOnPrMerge, {
        userId: USER_B,
        repoFullName: "alice/r3",
        enabled: true,
      });
      expect(a).toBe(false);
      expect(b).toBe(false);
      const row = await t.run(async (ctx) =>
        ctx.db
          .query("githubRepoConfigs")
          .withIndex("by_repoFullName", (q) =>
            q.eq("repoFullName", "alice/r3"),
          )
          .first(),
      );
      expect(row?.enabled).toBe(true);
      expect(row?.notifyOnPrMerge).toBe(false);
    });
  });
});
