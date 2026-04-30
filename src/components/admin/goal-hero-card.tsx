"use client";

// S5.2: dashboard hero card surfaces the user's primary active goal.
// "Current" live progress is not yet wired (scanners don't cache values
// per goal yet) — card shows target, metric, status, days-since-set,
// and the automation promise.
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { GoalMetric, GoalProvider } from "@/lib/goals/types";
import Link from "next/link";

const METRIC_NOUN: Record<GoalMetric, string> = {
  mrr: "MRR",
  total_revenue: "Total revenue",
  subscribers: "Subscribers",
  first_sale: "First sale",
  visitors: "Visitors",
  stars: "GitHub stars",
  custom: "Custom",
};

const PROVIDER_LABEL: Record<GoalProvider, string> = {
  stripe: "Stripe",
  posthog: "PostHog",
  ga4: "GA4",
  github: "GitHub",
};

function formatTarget(metric: GoalMetric, target: number | null): string {
  if (target == null) return "—";
  if (metric === "mrr" || metric === "total_revenue") {
    return `$${target.toLocaleString()}`;
  }
  return target.toLocaleString();
}

function daysSince(iso: string): number {
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}

export function GoalHeroCard({ userId }: { userId: string }) {
  const goals = useQuery(api.goals.listByUser, { userId });

  if (goals === undefined) {
    return (
      <div className="border-2 border-brand bg-white p-6 shadow-[4px_4px_0_var(--color-brand)] animate-pixel-skeleton h-32" />
    );
  }

  if (goals.length === 0) {
    return (
      <div className="border-2 border-dashed border-brand/40 bg-surface p-6 text-center">
        <p className="font-[family-name:var(--font-press-start)] text-[10px] text-brand mb-2">
          &#9656; No goal set
        </p>
        <p className="font-[family-name:var(--font-geist-sans)] text-sm text-brand/70 mb-4">
          Pick a milestone. brag.fast posts automatically when you hit it.
        </p>
        <Link
          href="/admin/sous-chef"
          className="inline-block font-[family-name:var(--font-press-start)] text-[10px] px-4 py-2 border-2 border-brand bg-gold text-brand shadow-[3px_3px_0_var(--color-brand)] hover:shadow-[1px_1px_0_var(--color-brand)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
        >
          Set a goal
        </Link>
      </div>
    );
  }

  // Primary: first enabled + not-fired goal. Fallback: most recently fired or first.
  const primary =
    goals.find((g) => g.enabled && !g.fired) ??
    goals.find((g) => g.enabled) ??
    goals[0];

  const isHit = primary.fired;
  const days = daysSince(primary.created_at);
  const targetStr = formatTarget(primary.metric, primary.target);
  const labelStr =
    primary.label ??
    (primary.metric === "stars" && primary.scope
      ? `${METRIC_NOUN.stars} for ${primary.scope}`
      : METRIC_NOUN[primary.metric]);
  const sourceStr =
    primary.provider != null ? PROVIDER_LABEL[primary.provider] : "Custom";

  return (
    <div
      className={`relative border-2 border-brand p-6 shadow-[4px_4px_0_var(--color-brand)] ${
        isHit ? "bg-gold" : "bg-white"
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <span className="font-[family-name:var(--font-press-start)] text-[9px] text-brand/60 uppercase tracking-wider">
          {isHit ? "Goal hit" : "Active goal"}
        </span>
        <span className="font-[family-name:var(--font-press-start)] text-[8px] text-brand/40">
          {sourceStr}
        </span>
      </div>

      <h2 className="font-[family-name:var(--font-press-start)] text-base md:text-lg text-brand mb-1 leading-relaxed">
        {labelStr}
      </h2>

      <div className="flex items-baseline gap-3 mb-4">
        <span className="font-[family-name:var(--font-press-start)] text-2xl text-brand">
          {targetStr}
        </span>
        <span className="font-[family-name:var(--font-geist-sans)] text-sm text-brand/60">
          target
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-4 text-xs text-brand/70 font-[family-name:var(--font-geist-sans)]">
        <span>
          {isHit ? "Hit" : "Set"} {days === 0 ? "today" : `${days}d ago`}
        </span>
        {primary.firstHitAt && (
          <span>· First hit {daysSince(primary.firstHitAt)}d ago</span>
        )}
        {goals.length > 1 && (
          <span>
            ·{" "}
            <Link
              href="/admin/sous-chef"
              className="underline underline-offset-2 hover:text-brand"
            >
              {goals.length - 1} more
            </Link>
          </span>
        )}
      </div>

      <p className="font-[family-name:var(--font-geist-sans)] text-sm text-brand/80 leading-relaxed border-t-2 border-brand/10 pt-4">
        {isHit
          ? primary.recurring
            ? "brag.fast already posted. Will fire again when this goal re-hits."
            : "brag.fast already posted this milestone."
          : "brag.fast will post automatically when you hit this."}
      </p>
    </div>
  );
}
