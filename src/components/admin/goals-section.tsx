"use client";

import { useState, useEffect } from "react";
import { PixelButton } from "./pixel-button";
import { PixelBadge } from "./pixel-badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type GoalProvider = "stripe" | "posthog" | "ga4" | "github";

export type Goal = {
  externalId: string;
  provider: string;
  metric: string;
  target: number | null;
  scope: string | null;
  label: string | null;
  enabled: boolean;
  fired: boolean;
  currentValue: number | null;
};

function fmtUsd(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`;
  return `$${n}`;
}

function fmtCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`;
  return `${n}`;
}

function formatProgress(metric: string, current: number, target: number): string {
  const isUsd = metric === "mrr" || metric === "total_revenue";
  const fmt = isUsd ? fmtUsd : fmtCount;
  return `${fmt(current)} / ${fmt(target)}`;
}

function formatGoalLabel(goal: Goal): string {
  const t = goal.target ?? 0;
  switch (goal.metric) {
    case "mrr": return `${fmtUsd(t)} MRR`;
    case "total_revenue": return `${fmtUsd(t)} total revenue`;
    case "subscribers": return `${fmtCount(t)} subscribers`;
    case "first_sale": return "First sale";
    case "visitors": return `${fmtCount(t)} visitors / 30 days`;
    case "stars": return `${fmtCount(t)} stars on ${goal.scope ?? "—"}`;
    default: return goal.metric;
  }
}

type Props = {
  provider: GoalProvider;
  connected: boolean;
  goals: Goal[];
  onReload: () => void;
};

export function GoalsSection({ provider, connected, goals, onReload }: Props) {
  const [showAdd, setShowAdd] = useState(false);

  if (!connected) {
    return (
      <p className="font-[family-name:var(--font-geist-sans)] text-xs text-brand/60 py-1">
        Connect this integration first to manage goals.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-[family-name:var(--font-press-start)] text-[10px] text-brand/70 uppercase tracking-wider">
          Goals
        </span>
        <PixelButton variant="ghost" onClick={() => setShowAdd(true)}>
          + Add
        </PixelButton>
      </div>

      {goals.length === 0 ? (
        <p className="font-[family-name:var(--font-geist-sans)] text-xs text-brand/60 py-1">
          No goals set yet.
        </p>
      ) : (
        <div className="divide-y divide-brand/10 border-2 border-brand/20">
          {goals.map((goal) => (
            <GoalRow key={goal.externalId} goal={goal} onReload={onReload} />
          ))}
        </div>
      )}

      {showAdd && (
        <AddGoalDialog
          provider={provider}
          onClose={() => setShowAdd(false)}
          onDone={() => {
            setShowAdd(false);
            onReload();
          }}
        />
      )}
    </div>
  );
}

function GoalRow({ goal, onReload }: { goal: Goal; onReload: () => void }) {
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [enabled, setEnabled] = useState(goal.enabled);

  async function handleToggle() {
    setToggling(true);
    const next = !enabled;
    setEnabled(next);
    try {
      await fetch(`/api/v1/goals/${goal.externalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      });
      onReload();
    } catch {
      setEnabled(!next);
    } finally {
      setToggling(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await fetch(`/api/v1/goals/${goal.externalId}`, { method: "DELETE" });
      onReload();
    } finally {
      setDeleting(false);
    }
  }

  const pct = goal.currentValue != null && goal.target != null && goal.target > 0
    ? Math.min(100, Math.round((goal.currentValue / goal.target) * 100))
    : null;

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 bg-white">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <PixelBadge
          label={goal.fired ? "hit" : enabled ? "on" : "off"}
          variant={goal.fired ? "active" : enabled ? "active" : "suspended"}
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-[family-name:var(--font-geist-sans)] text-sm font-medium text-brand truncate">
              {goal.label ?? formatGoalLabel(goal)}
            </span>
          </div>

          {pct !== null && goal.currentValue != null && goal.target != null && (
            <div className="flex items-center gap-2 mt-1.5">
              <div className="w-28 h-2 bg-brand/10 border border-brand/20 shrink-0">
                <div
                  className={`h-full transition-none ${goal.fired ? "bg-green-500" : "bg-brand"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="font-[family-name:var(--font-geist-mono)] text-[11px] text-brand/50 tabular-nums">
                {formatProgress(goal.metric, goal.currentValue, goal.target)}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <PixelButton variant="ghost" onClick={handleToggle} disabled={toggling}>
          {toggling ? "..." : enabled ? "Disable" : "Enable"}
        </PixelButton>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <PixelButton variant="danger">Delete</PixelButton>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete goal</AlertDialogTitle>
              <AlertDialogDescription>
                Delete &ldquo;{goal.label ?? formatGoalLabel(goal)}&rdquo;? This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel asChild>
                <PixelButton variant="ghost">Cancel</PixelButton>
              </AlertDialogCancel>
              <AlertDialogAction asChild>
                <PixelButton variant="danger" onClick={handleDelete} disabled={deleting}>
                  {deleting ? "..." : "Delete"}
                </PixelButton>
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

const STRIPE_METRICS = [
  { value: "mrr", label: "MRR" },
  { value: "total_revenue", label: "Total revenue" },
  { value: "subscribers", label: "Subscribers" },
  { value: "first_sale", label: "First sale" },
];

const ADD_TITLES: Record<GoalProvider, string> = {
  stripe: "Add Stripe goal",
  posthog: "Add PostHog goal",
  ga4: "Add Google Analytics goal",
  github: "Add GitHub stars goal",
};

type GithubRepo = { full_name: string; name: string };

function useGithubRepos(enabled: boolean) {
  const [repos, setRepos] = useState<GithubRepo[]>([]);
  useEffect(() => {
    if (!enabled) return;
    fetch("/api/github/repos")
      .then((r) => r.json())
      .then((d: { repos?: GithubRepo[] }) => setRepos(d.repos ?? []))
      .catch(() => {});
  }, [enabled]);
  return repos;
}

function AddGoalDialog({
  provider,
  onClose,
  onDone,
}: {
  provider: GoalProvider;
  onClose: () => void;
  onDone: () => void;
}) {
  const defaultMetric =
    provider === "stripe" ? "mrr" : provider === "github" ? "stars" : "visitors";

  const [metric, setMetric] = useState(defaultMetric);
  const [target, setTarget] = useState("");
  const [scope, setScope] = useState("");
  const [label, setLabel] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const githubRepos = useGithubRepos(provider === "github");

  const needsTarget = metric !== "first_sale";
  const needsScope = metric === "stars";

  const targetPlaceholder =
    metric === "mrr" || metric === "total_revenue" ? "1000" :
    metric === "subscribers" ? "100" :
    metric === "visitors" ? "10000" :
    metric === "stars" ? "100" : "1";

  const targetLabel =
    metric === "mrr" || metric === "total_revenue" ? "Target (USD)" :
    metric === "subscribers" ? "Target (count)" :
    "Target";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { provider, metric, enabled: true };
      if (needsTarget) body.target = parseFloat(target);
      if (needsScope) body.scope = scope;
      if (label.trim()) body.label = label.trim();

      const res = await fetch("/api/v1/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `Failed: ${res.status}`);
      }
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-brand/30 flex items-center justify-center p-4">
      <div className="bg-white border-2 border-brand shadow-[8px_8px_0_var(--color-brand)] p-6 max-w-lg w-full space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="font-[family-name:var(--font-press-start)] text-sm text-brand">
            {ADD_TITLES[provider]}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="font-[family-name:var(--font-press-start)] text-xs text-brand/60 hover:text-brand"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {provider === "stripe" && (
            <label className="block">
              <span className="font-[family-name:var(--font-geist-sans)] text-xs text-brand">
                Metric
              </span>
              <select
                value={metric}
                onChange={(e) => setMetric(e.target.value)}
                className="mt-1 w-full border-2 border-brand bg-white px-3 py-2 font-[family-name:var(--font-geist-mono)] text-sm"
              >
                {STRIPE_METRICS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </label>
          )}

          {needsScope && (
            <label className="block">
              <span className="font-[family-name:var(--font-geist-sans)] text-xs text-brand">
                Repository
              </span>
              {githubRepos.length > 0 ? (
                <select
                  value={scope}
                  onChange={(e) => setScope(e.target.value)}
                  required
                  className="mt-1 w-full border-2 border-brand bg-white px-3 py-2 font-[family-name:var(--font-geist-mono)] text-sm"
                >
                  <option value="">Select a repository…</option>
                  {githubRepos.map((r) => (
                    <option key={r.full_name} value={r.full_name}>
                      {r.full_name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={scope}
                  onChange={(e) => setScope(e.target.value)}
                  required
                  placeholder="owner/repo"
                  className="mt-1 w-full border-2 border-brand bg-white px-3 py-2 font-[family-name:var(--font-geist-mono)] text-sm"
                />
              )}
            </label>
          )}

          {needsTarget && (
            <label className="block">
              <span className="font-[family-name:var(--font-geist-sans)] text-xs text-brand">
                {targetLabel}
              </span>
              <input
                type="number"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                required
                min="1"
                step="1"
                placeholder={targetPlaceholder}
                className="mt-1 w-full border-2 border-brand bg-white px-3 py-2 font-[family-name:var(--font-geist-mono)] text-sm"
              />
            </label>
          )}

          <label className="block">
            <span className="font-[family-name:var(--font-geist-sans)] text-xs text-brand">
              Label{" "}
              <span className="text-brand/50">(optional)</span>
            </span>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. First $1k month"
              className="mt-1 w-full border-2 border-brand bg-white px-3 py-2 font-[family-name:var(--font-geist-mono)] text-sm"
            />
          </label>

          {error && (
            <p className="font-[family-name:var(--font-geist-mono)] text-xs text-red-600 break-words">
              {error}
            </p>
          )}

          <div className="flex gap-2">
            <PixelButton
              type="submit"
              disabled={
                submitting ||
                (needsTarget && !target) ||
                (needsScope && !scope)
              }
            >
              {submitting ? "Saving..." : "Add goal"}
            </PixelButton>
            <PixelButton type="button" variant="ghost" onClick={onClose}>
              Cancel
            </PixelButton>
          </div>
        </form>
      </div>
    </div>
  );
}
