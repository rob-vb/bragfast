// Weekly briefing summary — generated each Monday 07:00 UTC by cron, or on
// first visit to /admin/report when the cron hasn't fired yet for the current
// ISO week.
//
// This file holds the mutations + the public trigger. The Haiku-driven action
// lives in ./briefingsActions.ts (which carries the "use node" directive).
//
// Idempotency: each weekly draft has idempotencyKey
// `${userId}:cron:weekly:${YYYY-Www}`. The drafts table's by_idempotencyKey
// index lets us upsert safely from both the cron fan-out and the
// "Generate now" UI path. We do NOT write a milestoneHits row — the
// milestoneHits.sourceSystem union doesn't include "cron" by design (the
// hits table is for once-per-user-per-milestone records, not cron output).

import { internalMutation, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { requireAuthedUser } from "./auth";
import {
  buildIdempotencyKey,
  weeklySummaryMilestoneKey,
} from "../src/lib/drafts/idempotency-key";

// Idempotent weekly draft writer. If a draft already exists for this
// (userId, isoWeek), only patches `config` + `name` + clears
// `generationError` — never duplicates.
export const upsertWeeklyDraft = internalMutation({
  args: {
    userId: v.string(),
    isoWeek: v.string(),
    name: v.string(),
    config: v.string(),
  },
  handler: async (ctx, { userId, isoWeek, name, config }) => {
    const milestoneKey = weeklySummaryMilestoneKey(isoWeek);
    const idempotencyKey = buildIdempotencyKey(userId, "cron", milestoneKey);
    const existing = await ctx.db
      .query("drafts")
      .withIndex("by_idempotencyKey", (q) =>
        q.eq("idempotencyKey", idempotencyKey),
      )
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        name,
        config,
        generationError: undefined,
      });
      return { id: existing.externalId, created: false };
    }
    const externalId = `drf_${crypto.randomUUID().slice(0, 10)}`;
    const now = new Date().toISOString();
    await ctx.db.insert("drafts", {
      userId,
      externalId,
      name,
      source: "agent",
      createdBy: "weekly-report",
      config,
      originalConfig: config,
      sourceSystem: "cron",
      milestoneKey,
      idempotencyKey,
      created_at: now,
    });
    return { id: externalId, created: true };
  },
});

// Records a generation failure so the UI can offer "Regenerate".
// Stores a minimal placeholder draft when none exists, so the UI has a target.
export const markWeeklyDraftError = internalMutation({
  args: {
    userId: v.string(),
    isoWeek: v.string(),
    error: v.string(),
  },
  handler: async (ctx, { userId, isoWeek, error }) => {
    const milestoneKey = weeklySummaryMilestoneKey(isoWeek);
    const idempotencyKey = buildIdempotencyKey(userId, "cron", milestoneKey);
    const existing = await ctx.db
      .query("drafts")
      .withIndex("by_idempotencyKey", (q) =>
        q.eq("idempotencyKey", idempotencyKey),
      )
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { generationError: error });
      return;
    }
    const externalId = `drf_${crypto.randomUUID().slice(0, 10)}`;
    const now = new Date().toISOString();
    const placeholderConfig = JSON.stringify({
      output: "image",
      templateId: "hero",
      objectContent: {
        title: { text: "Weekly summary" },
        description: { text: "(generation failed — try again)" },
      },
      notes: `Sous-Chef weekly: ${milestoneKey}`,
    });
    await ctx.db.insert("drafts", {
      userId,
      externalId,
      name: "Weekly summary",
      source: "agent",
      createdBy: "weekly-report",
      config: placeholderConfig,
      sourceSystem: "cron",
      milestoneKey,
      idempotencyKey,
      generationError: error,
      created_at: now,
    });
  },
});

// User-facing escape hatch: called from /admin/report on first visit when the
// cron hasn't fired yet for the current week (e.g. user opens the page on
// Sunday before Monday morning), or when the previous attempt errored and
// the user clicked "Regenerate". Idempotent — safe to call multiple times.
export const triggerWeeklySummaryIfNeeded = mutation({
  args: { isoWeek: v.string(), startISO: v.string(), endISO: v.string() },
  handler: async (ctx, { isoWeek, startISO, endISO }) => {
    const userId = await requireAuthedUser(ctx);
    const milestoneKey = weeklySummaryMilestoneKey(isoWeek);
    const idempotencyKey = buildIdempotencyKey(userId, "cron", milestoneKey);
    const existing = await ctx.db
      .query("drafts")
      .withIndex("by_idempotencyKey", (q) =>
        q.eq("idempotencyKey", idempotencyKey),
      )
      .first();
    // If a draft exists with no error, nothing to do. If it has an error, the
    // user clicked "Regenerate" — schedule a fresh attempt.
    if (existing && !existing.generationError) {
      return { scheduled: false, externalId: existing.externalId };
    }
    await ctx.scheduler.runAfter(
      0,
      internal.briefingsActions.generateWeeklySummaryDraft,
      { userId, isoWeek, startISO, endISO },
    );
    return { scheduled: true, externalId: existing?.externalId ?? null };
  },
});

// Session-scoped: read the weekly draft for the current ISO week (if any).
// Returns null when not yet generated or unauthenticated.
export const getWeeklyDraft = query({
  args: { isoWeek: v.string() },
  handler: async (ctx, { isoWeek }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const userId = identity.subject;
    const milestoneKey = weeklySummaryMilestoneKey(isoWeek);
    const idempotencyKey = buildIdempotencyKey(userId, "cron", milestoneKey);
    const row = await ctx.db
      .query("drafts")
      .withIndex("by_idempotencyKey", (q) =>
        q.eq("idempotencyKey", idempotencyKey),
      )
      .first();
    if (!row || row.userId !== userId) return null;
    return {
      id: row.externalId,
      name: row.name ?? null,
      config: row.config,
      generationError: row.generationError ?? null,
      created_at: row.created_at,
    };
  },
});
