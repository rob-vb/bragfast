// S9.1: weekly digest email.
//
// Cron crons.weekly invokes sendAllWeeklyDigests which fans out per-user via
// scheduler.runAfter. sendWeeklyDigest aggregates triggerEvents for the last
// 7 days and POSTs to /api/internal/send-email so the existing Resend wiring
// (src/lib/email.ts) renders and sends. Skip users with zero approved posts
// in the window — no spam for inactive accounts.
//
// Same Convex → Next.js pattern as goalEmails.ts (Convex modules cannot import
// from src/, so the email template lives Next.js-side).

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

const WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export const sendWeeklyDigest = internalAction({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const profile = await ctx.runQuery(
      internal.userProfiles.getByUserIdInternal,
      { userId },
    );
    const email = profile?.email;
    if (!email) return;

    const endISO = new Date().toISOString();
    const startISO = new Date(Date.now() - WINDOW_MS).toISOString();
    const agg = await ctx.runQuery(
      internal.triggerEvents.aggregateForUserBetween,
      { userId, startISO, endISO },
    );

    // Skip silent weeks. Users with no approved posts get no email.
    if (agg.approved === 0) return;

    const siteUrl = process.env.SITE_URL;
    const secret = process.env.INTERNAL_API_SECRET;
    if (!siteUrl || !secret) {
      console.error("[digestEmails] missing SITE_URL or INTERNAL_API_SECRET");
      return;
    }

    try {
      const res = await fetch(`${siteUrl}/api/internal/send-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${secret}`,
        },
        body: JSON.stringify({
          type: "weekly-digest",
          to: email,
          data: {
            approved: agg.approved,
            drafted: agg.drafted,
            autoSkipped: agg.auto_skipped,
            userSkipped: agg.user_skipped,
            approvedBySource: agg.approvedBySource,
            topReferences: agg.topReferences,
            dashboardUrl: `${siteUrl}/admin/sous-chef/history`,
          },
        }),
      });
      if (!res.ok) {
        console.error(
          "[digestEmails] send failed",
          res.status,
          await res.text(),
        );
      }
    } catch (err) {
      console.error("[digestEmails] send threw", err);
    }
  },
});

export const sendAllWeeklyDigests = internalAction({
  args: {},
  handler: async (ctx): Promise<{ scheduled: number }> => {
    const profiles = await ctx.runQuery(
      internal.userProfiles.listAllWithEmailInternal,
      {},
    );
    for (const p of profiles as Array<{ userId: string; email: string }>) {
      await ctx.scheduler.runAfter(0, internal.digestEmails.sendWeeklyDigest, {
        userId: p.userId,
      });
    }
    return { scheduled: profiles.length };
  },
});
