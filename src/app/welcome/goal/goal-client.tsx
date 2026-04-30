"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GoalCreateModal, type GoalCategory } from "@/components/admin/goal-create-modal";

type ConnectedFlags = {
  stripe: boolean;
  posthog: boolean;
  ga4: boolean;
};

export function GoalStepClient() {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [connected, setConnected] = useState<ConnectedFlags>({
    stripe: false,
    posthog: false,
    ga4: false,
  });
  const [isFirstGoal, setIsFirstGoal] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [secRes, goalsRes] = await Promise.all([
          fetch("/api/v1/sous-chef/integrations").catch(() => null),
          fetch("/api/v1/goals").catch(() => null),
        ]);
        if (cancelled) return;
        if (secRes?.ok) {
          const json = (await secRes.json()) as {
            integrations?: Array<{ provider: string; enabled?: boolean }>;
          };
          const rows = json.integrations ?? [];
          const flags: ConnectedFlags = { stripe: false, posthog: false, ga4: false };
          for (const row of rows) {
            const enabled = row.enabled ?? true;
            if (row.provider === "stripe") flags.stripe = enabled;
            if (row.provider === "posthog") flags.posthog = enabled;
            if (row.provider === "ga4") flags.ga4 = enabled;
          }
          setConnected(flags);
        }
        if (goalsRes?.ok) {
          const json = (await goalsRes.json()) as { goals?: Array<unknown> };
          setIsFirstGoal((json.goals ?? []).length === 0);
        }
      } catch {
        /* ignore — defaults are safe */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function onCreated(category: GoalCategory) {
    setOpen(false);
    router.push(`/welcome/integration?cat=${category}`);
  }

  function onSkip() {
    setOpen(false);
    router.push("/welcome/integration?cat=skip");
  }

  return (
    <>
      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={onSkip}
          className="font-mono text-xs uppercase tracking-widest text-brand/60 hover:text-brand underline underline-offset-4"
        >
          Skip for now →
        </button>
      </div>
      <GoalCreateModal
        open={open}
        onClose={onSkip}
        onCreated={onCreated}
        isFirstGoal={isFirstGoal}
        connected={connected}
        hideClose
      />
    </>
  );
}
