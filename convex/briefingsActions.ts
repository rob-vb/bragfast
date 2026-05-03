"use node";

// Weekly briefing — Haiku-driven generation. Lives in its own file because
// the "use node" directive isolates the Anthropic SDK from the V8 isolate
// that runs queries/mutations. Queries, mutations, and the public trigger
// live in ./briefings.ts.

import { z } from "zod";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { callHaikuJson } from "../src/lib/haiku-call";
import type { DraftConfig } from "../src/lib/drafts/types";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// ISO 8601 week string in `YYYY-Www` form (e.g. "2026-W18").
function isoWeekString(d: Date): string {
  const target = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
  const dayNum = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(
    ((target.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7,
  );
  return `${target.getUTCFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

// Returns [startISO, endISO) for the most recently completed ISO week.
// Cron fires Monday 07:00 UTC, so "previous week" means the 7 days ending
// at 00:00 UTC the previous Monday.
function previousWeekWindow(now: Date): {
  startISO: string;
  endISO: string;
  isoWeek: string;
} {
  const day = now.getUTCDay(); // 0=Sun, 1=Mon, ...
  const daysSinceMonday = (day + 6) % 7;
  const thisMonday = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - daysSinceMonday,
      0,
      0,
      0,
      0,
    ),
  );
  const previousMonday = new Date(thisMonday.getTime() - WEEK_MS);
  return {
    startISO: previousMonday.toISOString(),
    endISO: thisMonday.toISOString(),
    isoWeek: isoWeekString(previousMonday),
  };
}

const SummarySchema = z.object({
  title: z.string().transform((s) => s.slice(0, 80)),
  description: z.string().transform((s) => s.slice(0, 220)),
  reason: z.string().transform((s) => s.slice(0, 400)),
});

type WeeklyAggregate = {
  total: number;
  approved: number;
  drafted: number;
  auto_skipped: number;
  user_skipped: number;
  approvedBySource: Record<string, number>;
  topReferences: Array<{ reference: string; count: number }>;
};

function aggregateRows(
  rows: Array<{
    decision: string;
    sourceSystem: string;
    sourceReference?: string;
  }>,
): WeeklyAggregate {
  const byDecision: Record<string, number> = {};
  const approvedBySource: Record<string, number> = {};
  const refCounts = new Map<string, number>();
  for (const r of rows) {
    byDecision[r.decision] = (byDecision[r.decision] ?? 0) + 1;
    if (r.decision === "approved") {
      approvedBySource[r.sourceSystem] =
        (approvedBySource[r.sourceSystem] ?? 0) + 1;
      if (r.sourceReference) {
        refCounts.set(
          r.sourceReference,
          (refCounts.get(r.sourceReference) ?? 0) + 1,
        );
      }
    }
  }
  return {
    total: rows.length,
    approved: byDecision["approved"] ?? 0,
    drafted: byDecision["drafted"] ?? 0,
    auto_skipped: byDecision["auto_skipped"] ?? 0,
    user_skipped: byDecision["user_skipped"] ?? 0,
    approvedBySource,
    topReferences: [...refCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([reference, count]) => ({ reference, count })),
  };
}

function buildHaikuUserPrompt(isoWeek: string, agg: WeeklyAggregate): string {
  const lines: string[] = [
    `ISO week: ${isoWeek}`,
    `Total trigger events: ${agg.total}`,
    `Approved (shipped posts): ${agg.approved}`,
    `Drafted (awaiting approval): ${agg.drafted}`,
    `Auto-skipped: ${agg.auto_skipped}`,
    `User-skipped: ${agg.user_skipped}`,
  ];
  const sourceEntries = Object.entries(agg.approvedBySource);
  if (sourceEntries.length) {
    lines.push("Approved by source:");
    for (const [src, count] of sourceEntries) lines.push(`  - ${src}: ${count}`);
  }
  if (agg.topReferences.length) {
    lines.push("Top approved references:");
    for (const r of agg.topReferences)
      lines.push(`  - ${r.reference} (${r.count}x)`);
  }
  lines.push("", "Write the weekly summary JSON.");
  return lines.join("\n");
}

// Compose + store the weekly summary draft for one user. Skips silent weeks
// (zero drafted/approved trigger events). Records `generationError` on Haiku
// failure so the UI can surface a "Regenerate" affordance.
export const generateWeeklySummaryDraft = internalAction({
  args: {
    userId: v.string(),
    isoWeek: v.optional(v.string()),
    startISO: v.optional(v.string()),
    endISO: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ skipped: boolean; isoWeek: string }> => {
    const window =
      args.startISO && args.endISO && args.isoWeek
        ? { startISO: args.startISO, endISO: args.endISO, isoWeek: args.isoWeek }
        : previousWeekWindow(new Date());

    const rows = await ctx.runQuery(
      internal.triggerEvents.listByUserForWeekInternal,
      {
        userId: args.userId,
        startISO: window.startISO,
        endISO: window.endISO,
      },
    );
    const agg = aggregateRows(
      rows as Array<{
        decision: string;
        sourceSystem: string;
        sourceReference?: string;
      }>,
    );

    // Silent week: no signal to summarize. Skip without recording an error.
    if (agg.drafted === 0 && agg.approved === 0) {
      return { skipped: true, isoWeek: window.isoWeek };
    }

    try {
      const summary = await callHaikuJson({
        system: `You write a one-paragraph weekly retrospective for an indie founder.
Output JSON with three short fields:
- title: the week's headline (e.g. "Week of Apr 27 — 3 ships, $1.2k MRR")
- description: 1–2 sentences on what shipped and what's notable
- reason: 1–3 sentences of plain-spoken context for *why* this week mattered

Tone: dry, factual, no hype. No emojis. No exclamation marks.`,
        user: buildHaikuUserPrompt(window.isoWeek, agg),
        schema: SummarySchema,
        fallback: {
          title: `Week ${window.isoWeek}`,
          description: `${agg.approved} approved · ${agg.drafted} drafted`,
          reason:
            "Auto-generated from your trigger events. Edit before sending.",
        },
        maxTokens: 350,
      });

      const draftConfig: DraftConfig = {
        output: "image",
        templateId: "hero",
        objectContent: {
          title: { text: summary.title },
          description: { text: summary.description },
        },
        notes: `Sous-Chef weekly: ${window.isoWeek}\n\n${summary.reason}`,
      };

      await ctx.runMutation(internal.briefings.upsertWeeklyDraft, {
        userId: args.userId,
        isoWeek: window.isoWeek,
        name: summary.title,
        config: JSON.stringify(draftConfig),
      });
      return { skipped: false, isoWeek: window.isoWeek };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await ctx.runMutation(internal.briefings.markWeeklyDraftError, {
        userId: args.userId,
        isoWeek: window.isoWeek,
        error: msg,
      });
      return { skipped: false, isoWeek: window.isoWeek };
    }
  },
});

// Cron entry point: schedule a per-user generation for every userProfile.
export const generateWeeklySummaryDraftsForAll = internalAction({
  args: {},
  handler: async (ctx): Promise<{ scheduled: number }> => {
    const profiles = await ctx.runQuery(
      internal.userProfiles.listAllInternal,
      {},
    );
    for (const p of profiles as Array<{ userId: string }>) {
      await ctx.scheduler.runAfter(
        0,
        internal.briefingsActions.generateWeeklySummaryDraft,
        { userId: p.userId },
      );
    }
    return { scheduled: profiles.length };
  },
});
