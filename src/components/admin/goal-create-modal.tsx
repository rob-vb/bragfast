"use client";

import { useState } from "react";
import posthog from "posthog-js";

export type GoalCategory = "revenue" | "users" | "traffic" | "custom";

type ConnectedProviders = {
  stripe: boolean;
  posthog: boolean;
  ga4: boolean;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (category: GoalCategory) => void;
  isFirstGoal: boolean;
  connected: ConnectedProviders;
  hideClose?: boolean;
};

type RevenueMetric = "mrr" | "total_revenue" | "first_sale";

type Step = "category" | "form";

export function GoalCreateModal({
  open,
  onClose,
  onCreated,
  isFirstGoal,
  connected,
  hideClose,
}: Props) {
  const [step, setStep] = useState<Step>("category");
  const [category, setCategory] = useState<GoalCategory | null>(null);

  // Per-category form state
  const [revMetric, setRevMetric] = useState<RevenueMetric>("mrr");
  const [target, setTarget] = useState<string>("");
  const [trafficProvider, setTrafficProvider] = useState<"posthog" | "ga4">(
    connected.posthog ? "posthog" : "ga4",
  );
  const [customLabel, setCustomLabel] = useState<string>("");
  const [customTarget, setCustomTarget] = useState<string>("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  function reset() {
    setStep("category");
    setCategory(null);
    setRevMetric("mrr");
    setTarget("");
    setCustomLabel("");
    setCustomTarget("");
    setError(null);
  }

  function close() {
    reset();
    onClose();
  }

  function pickCategory(c: GoalCategory) {
    setCategory(c);
    setStep("form");
  }

  async function submit(body: Record<string, unknown>, goalCategory: GoalCategory) {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `Failed: ${res.status}`);
      }
      posthog.capture("goal_set", {
        goal_category: goalCategory,
        is_first_goal: isFirstGoal,
        has_connected_source:
          goalCategory === "custom"
            ? false
            : connected.stripe || connected.posthog || connected.ga4,
      });
      reset();
      onCreated(goalCategory);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!category) return;

    if (category === "revenue") {
      const needsTarget = revMetric !== "first_sale";
      const body: Record<string, unknown> = {
        provider: "stripe",
        metric: revMetric,
        enabled: true,
      };
      if (needsTarget) body.target = parseFloat(target);
      await submit(body, "revenue");
      return;
    }

    if (category === "users") {
      await submit(
        {
          provider: "stripe",
          metric: "subscribers",
          target: parseFloat(target),
          enabled: true,
        },
        "users",
      );
      return;
    }

    if (category === "traffic") {
      await submit(
        {
          provider: trafficProvider,
          metric: "visitors",
          target: parseFloat(target),
          enabled: true,
        },
        "traffic",
      );
      return;
    }

    if (category === "custom") {
      const body: Record<string, unknown> = {
        provider: null,
        metric: "custom",
        label: customLabel.trim(),
        enabled: true,
      };
      const t = parseFloat(customTarget);
      if (!Number.isNaN(t) && t > 0) body.target = t;
      await submit(body, "custom");
      return;
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-brand/40 flex items-stretch sm:items-center justify-center p-0 sm:p-6 overflow-y-auto"
      onClick={hideClose ? undefined : close}
    >
      <div
        className="bg-white border-[3px] border-brand shadow-[6px_6px_0_var(--color-brand)] w-full max-w-2xl my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-brand text-gold px-5 py-3 font-mono text-xs uppercase tracking-widest flex items-center justify-between">
          <span>▸ Set a goal</span>
          {!hideClose && (
            <button
              type="button"
              onClick={close}
              className="text-gold hover:text-white px-2"
              aria-label="Close"
            >
              ✕
            </button>
          )}
        </div>

        {step === "category" && (
          <div className="p-5 sm:p-6 space-y-4">
            <p className="text-sm text-brand/70 leading-relaxed">
              Pick a category. brag.fast posts automatically when you cross the
              threshold.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <CategoryButton
                label="Revenue"
                hint="MRR, total revenue, first sale"
                disabled={!connected.stripe}
                disabledHint="Connect Stripe first"
                onClick={() => pickCategory("revenue")}
              />
              <CategoryButton
                label="Users"
                hint="Subscriber counts via Stripe"
                disabled={!connected.stripe}
                disabledHint="Connect Stripe first"
                onClick={() => pickCategory("users")}
              />
              <CategoryButton
                label="Traffic"
                hint="Visitors via PostHog or GA4"
                disabled={!connected.posthog && !connected.ga4}
                disabledHint="Connect PostHog or GA4 first"
                onClick={() => pickCategory("traffic")}
              />
              <CategoryButton
                label="Custom"
                hint="Anything else — track and post by hand"
                onClick={() => pickCategory("custom")}
              />
            </div>
          </div>
        )}

        {step === "form" && category === "revenue" && (
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
            <FormHeader onBack={() => setStep("category")} title="Revenue goal" />
            <Field label="Metric">
              <select
                value={revMetric}
                onChange={(e) => setRevMetric(e.target.value as RevenueMetric)}
                className="w-full border-2 border-brand bg-white px-3 py-2 font-mono text-sm"
              >
                <option value="mrr">Monthly recurring revenue</option>
                <option value="total_revenue">Total revenue</option>
                <option value="first_sale">First sale</option>
              </select>
            </Field>
            {revMetric !== "first_sale" && (
              <Field label="Target (USD)">
                <input
                  type="number"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  required
                  min="1"
                  step="1"
                  placeholder="1000"
                  className="w-full border-2 border-brand bg-white px-3 py-2 font-mono text-sm"
                />
              </Field>
            )}
            <SubmitRow
              submitting={submitting}
              disabled={submitting || (revMetric !== "first_sale" && !target)}
              onCancel={close}
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
          </form>
        )}

        {step === "form" && category === "users" && (
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
            <FormHeader onBack={() => setStep("category")} title="Users goal" />
            <Field label="Active subscribers (Stripe)">
              <input
                type="number"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                required
                min="1"
                step="1"
                placeholder="100"
                className="w-full border-2 border-brand bg-white px-3 py-2 font-mono text-sm"
              />
            </Field>
            <SubmitRow
              submitting={submitting}
              disabled={submitting || !target}
              onCancel={close}
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
          </form>
        )}

        {step === "form" && category === "traffic" && (
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
            <FormHeader onBack={() => setStep("category")} title="Traffic goal" />
            {connected.posthog && connected.ga4 && (
              <Field label="Source">
                <select
                  value={trafficProvider}
                  onChange={(e) =>
                    setTrafficProvider(e.target.value as "posthog" | "ga4")
                  }
                  className="w-full border-2 border-brand bg-white px-3 py-2 font-mono text-sm"
                >
                  <option value="posthog">PostHog</option>
                  <option value="ga4">Google Analytics 4</option>
                </select>
              </Field>
            )}
            <Field label="Visitors per 30 days">
              <input
                type="number"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                required
                min="1"
                step="1"
                placeholder="10000"
                className="w-full border-2 border-brand bg-white px-3 py-2 font-mono text-sm"
              />
            </Field>
            <SubmitRow
              submitting={submitting}
              disabled={submitting || !target}
              onCancel={close}
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
          </form>
        )}

        {step === "form" && category === "custom" && (
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
            <FormHeader
              onBack={() => setStep("category")}
              title="Custom goal"
            />
            <p className="text-sm text-brand/70 leading-relaxed">
              No integration needed. You track it; brag.fast drafts a post when
              you mark it hit.
            </p>
            <Field label="Label">
              <input
                type="text"
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                required
                placeholder="100 mailing-list subs"
                className="w-full border-2 border-brand bg-white px-3 py-2 font-mono text-sm"
              />
            </Field>
            <Field label="Target (optional)">
              <input
                type="number"
                value={customTarget}
                onChange={(e) => setCustomTarget(e.target.value)}
                min="1"
                step="1"
                placeholder="100"
                className="w-full border-2 border-brand bg-white px-3 py-2 font-mono text-sm"
              />
            </Field>
            <SubmitRow
              submitting={submitting}
              disabled={submitting || !customLabel.trim()}
              onCancel={close}
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
          </form>
        )}
      </div>
    </div>
  );
}

function CategoryButton({
  label,
  hint,
  onClick,
  disabled,
  disabledHint,
}: {
  label: string;
  hint: string;
  onClick: () => void;
  disabled?: boolean;
  disabledHint?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="text-left bg-white text-brand border-2 border-brand px-4 py-3 shadow-[3px_3px_0_var(--color-brand)] transition-all hover:shadow-[1px_1px_0_var(--color-brand)] hover:translate-x-[2px] hover:translate-y-[2px] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-[3px_3px_0_var(--color-brand)] disabled:hover:translate-x-0 disabled:hover:translate-y-0"
    >
      <div className="font-mono text-xs uppercase tracking-widest font-bold">
        {label}
      </div>
      <div className="text-xs text-brand/60 mt-0.5">
        {disabled && disabledHint ? disabledHint : hint}
      </div>
    </button>
  );
}

function FormHeader({ onBack, title }: { onBack: () => void; title: string }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="font-mono text-sm uppercase tracking-widest text-brand font-bold">
        {title}
      </h2>
      <button
        type="button"
        onClick={onBack}
        className="font-mono text-xs uppercase tracking-widest text-brand/60 hover:text-brand"
      >
        ← back
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs text-brand">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function SubmitRow({
  submitting,
  disabled,
  onCancel,
}: {
  submitting: boolean;
  disabled: boolean;
  onCancel: () => void;
}) {
  return (
    <div className="flex gap-3 pt-2">
      <button
        type="submit"
        disabled={disabled}
        className="flex-1 bg-gold text-brand border-2 border-brand px-4 py-3 font-mono text-xs uppercase tracking-widest font-bold shadow-[3px_3px_0_var(--color-brand)] transition-all hover:shadow-[2px_2px_0_var(--color-brand)] hover:translate-x-[1px] hover:translate-y-[1px] disabled:opacity-50"
      >
        {submitting ? "Saving…" : "▸ Set goal"}
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="bg-white text-brand border-2 border-brand px-4 py-3 font-mono text-xs uppercase tracking-widest font-bold shadow-[3px_3px_0_var(--color-brand)]"
      >
        Cancel
      </button>
    </div>
  );
}
