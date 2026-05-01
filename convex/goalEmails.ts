// S5.5: celebration email dispatch.
//
// Scanners call internal.goals.markFired and receive { firstHit, userId, label,
// metric, target, scope }. When firstHit === true, they schedule this action
// which fetches the user's email and POSTs to /api/internal/send-email so the
// existing Resend wiring (src/lib/email.ts) can render and send.
//
// Convex modules cannot import from src/, so the email template lives on the
// Next.js side and Convex calls back over HTTP using INTERNAL_API_SECRET. Same
// pattern as convex/auth.ts sendResetPassword.

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

function buildLabel(args: {
  label: string | null;
  metric: string | null;
  target: number | null;
  scope: string | null;
}): string {
  if (args.label) return args.label;
  const target = args.target;
  switch (args.metric) {
    case "mrr":
      return target ? `$${target.toLocaleString()} MRR` : "your MRR target";
    case "total_revenue":
      return target ? `$${target.toLocaleString()} total revenue` : "your revenue target";
    case "subscribers":
      return target ? `${target.toLocaleString()} subscribers` : "your subscriber target";
    case "first_sale":
      return "your first sale";
    case "visitors":
      return target ? `${target.toLocaleString()} visitors` : "your traffic target";
    case "stars":
      return args.scope
        ? `${target?.toLocaleString() ?? "your"} stars on ${args.scope}`
        : `${target?.toLocaleString() ?? "your"} GitHub stars`;
    default:
      return "your goal";
  }
}

export const sendCelebrationEmail = internalAction({
  args: {
    userId: v.string(),
    label: v.union(v.string(), v.null()),
    metric: v.union(v.string(), v.null()),
    target: v.union(v.number(), v.null()),
    scope: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.runQuery(internal.userProfiles.getByUserIdInternal, {
      userId: args.userId,
    });
    const email = profile?.email;
    if (!email) {
      console.warn("[goalEmails] no email on userProfile", args.userId);
      return;
    }

    const siteUrl = process.env.SITE_URL;
    const secret = process.env.INTERNAL_API_SECRET;
    if (!siteUrl || !secret) {
      console.error("[goalEmails] missing SITE_URL or INTERNAL_API_SECRET");
      return;
    }

    const goalLabel = buildLabel(args);
    const approveUrl = `${siteUrl}/admin/drafts`;

    try {
      const res = await fetch(`${siteUrl}/api/internal/send-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${secret}`,
        },
        body: JSON.stringify({
          type: "goal-hit",
          to: email,
          data: { goalLabel, approveUrl },
        }),
      });
      if (!res.ok) {
        console.error(
          "[goalEmails] send failed",
          res.status,
          await res.text(),
        );
      }
    } catch (err) {
      console.error("[goalEmails] send threw", err);
    }
  },
});
