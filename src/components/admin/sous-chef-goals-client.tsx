"use client";

import { useCallback, useEffect, useState } from "react";
import { PixelCard } from "./pixel-card";
import { GoalsSection, type Goal } from "./goals-section";
import { GoalCreateModal } from "./goal-create-modal";

type IntegrationRow = {
  provider: string;
  enabled: boolean;
};

type GoalProvider = "stripe" | "posthog" | "ga4" | "github";

const PROVIDERS: GoalProvider[] = ["github", "stripe", "posthog", "ga4"];

const GOAL_PROVIDER_LABELS: Record<GoalProvider, string> = {
  github: "GitHub",
  stripe: "Stripe",
  posthog: "PostHog",
  ga4: "Google Analytics",
};

export function SousChefGoalsClient({ hasGithub }: { hasGithub: boolean }) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [rows, setRows] = useState<IntegrationRow[]>([]);
  const [showModal, setShowModal] = useState(false);

  const reload = useCallback(async () => {
    const [intRes, goalRes] = await Promise.all([
      fetch("/api/v1/sous-chef/integrations"),
      fetch("/api/v1/goals"),
    ]);
    if (intRes.ok) {
      const data = (await intRes.json()) as { integrations: IntegrationRow[] };
      setRows(data.integrations);
    }
    if (goalRes.ok) {
      const data = (await goalRes.json()) as { goals: Goal[] };
      setGoals(data.goals);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount
    void reload();
  }, [reload]);

  const byProvider = new Map(rows.map((r) => [r.provider, r] as const));

  function isConnected(p: GoalProvider): boolean {
    if (p === "github") return hasGithub;
    return byProvider.get(p)?.enabled === true;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="font-[family-name:var(--font-press-start)] text-lg text-brand">
          Goals
        </h1>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="bg-gold text-brand border-2 border-brand px-4 py-3 font-mono text-xs uppercase tracking-widest font-bold shadow-[3px_3px_0_var(--color-brand)] transition-all hover:shadow-[1px_1px_0_var(--color-brand)] hover:translate-x-[2px] hover:translate-y-[2px]"
        >
          ▸ New goal
        </button>
      </div>

      <p className="font-[family-name:var(--font-geist-sans)] text-sm text-brand/80 max-w-prose">
        Set milestones across your connected sources. Sous-Chef drafts a brag
        post the moment you hit one.
      </p>

      {PROVIDERS.map((p) => (
        <PixelCard key={p}>
          <div className="space-y-3">
            <h2 className="font-[family-name:var(--font-press-start)] text-sm text-brand">
              {GOAL_PROVIDER_LABELS[p]}
            </h2>
            <GoalsSection
              provider={p}
              connected={isConnected(p)}
              goals={goals.filter((g) => g.provider === p)}
              onReload={reload}
            />
          </div>
        </PixelCard>
      ))}

      <GoalCreateModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onCreated={async () => {
          setShowModal(false);
          await reload();
        }}
        isFirstGoal={goals.length === 0}
        connected={{
          stripe: byProvider.get("stripe")?.enabled ?? false,
          posthog: byProvider.get("posthog")?.enabled ?? false,
          ga4: byProvider.get("ga4")?.enabled ?? false,
          github: hasGithub,
        }}
      />
    </div>
  );
}
