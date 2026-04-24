"use client";

import { useState, useEffect, useCallback } from "react";
import { PixelButton } from "./pixel-button";
import { PixelCard } from "./pixel-card";
import { GitHubSection } from "./github-section";
import { GoalsSection } from "./goals-section";
import type { Goal } from "./goals-section";
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

type GitHubInstallation = {
  _id: string;
  installationId: number;
  accountLogin: string;
  accountType: string;
  enabled: boolean;
  status: string;
  lastScanAt: string | null;
  lastScanOkAt: string | null;
  lastScanError: string | null;
};

type GitHubPropShape = {
  installations: GitHubInstallation[];
  appSlug: string;
};

type Provider = "stripe" | "posthog" | "ga4";

type IntegrationRow = {
  provider: Provider;
  enabled: boolean;
  lastScanAt: string | null;
  lastScanOkAt: string | null;
  lastScanError: string | null;
};

const PROVIDER_LABELS: Record<Provider, string> = {
  stripe: "Stripe",
  posthog: "PostHog",
  ga4: "Google Analytics",
};

const PROVIDER_DESCRIPTIONS: Record<Provider, string> = {
  stripe: "Track revenue milestones: MRR, total revenue, subscribers, and first sale.",
  posthog: "Track visitor milestones from PostHog analytics (30-day rolling window).",
  ga4: "Track visitor milestones from Google Analytics 4 (30-day rolling window).",
};

export function SousChefClient({ github }: { github: GitHubPropShape }) {
  const [rows, setRows] = useState<IntegrationRow[] | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [activeForm, setActiveForm] = useState<Provider | null>(null);

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
    reload();
  }, [reload]);

  const byProvider = new Map<Provider, IntegrationRow>(
    (rows ?? []).map((r) => [r.provider, r]),
  );

  const githubConnected = github.installations.some(
    (i) => i.status === "active" && i.enabled,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="font-[family-name:var(--font-press-start)] text-lg text-brand">
          Sous-Chef
        </h1>
        <span className="font-[family-name:var(--font-geist-sans)] text-sm text-brand/60">
          Prepping tomorrow&apos;s post tonight
        </span>
      </div>

      <p className="font-[family-name:var(--font-geist-sans)] text-sm text-brand/80 max-w-prose">
        Sous-Chef watches your connected apps for milestones and drafts brag
        posts automatically. You still approve every post — Sous-Chef just
        catches the moments you&apos;d otherwise miss.
      </p>

      {/* GitHub */}
      <PixelCard>
        <div className="space-y-4">
          <h2 className="font-[family-name:var(--font-press-start)] text-sm text-brand">
            GitHub
          </h2>
          <GitHubSection
            installations={github.installations}
            appSlug={github.appSlug}
          />
          <div className="border-t-2 border-brand/20 pt-4">
            <GoalsSection
              provider="github"
              connected={githubConnected}
              goals={goals.filter((g) => g.provider === "github")}
              onReload={reload}
            />
          </div>
        </div>
      </PixelCard>

      {/* Stripe, PostHog, GA4 */}
      {(["stripe", "posthog", "ga4"] as Provider[]).map((provider) => (
        <IntegrationBlock
          key={provider}
          provider={provider}
          row={byProvider.get(provider) ?? null}
          goals={goals.filter((g) => g.provider === provider)}
          onConnect={() => setActiveForm(provider)}
          onReload={reload}
        />
      ))}

      {activeForm && (
        <ConnectDialog
          provider={activeForm}
          onClose={() => setActiveForm(null)}
          onDone={async () => {
            setActiveForm(null);
            await reload();
          }}
        />
      )}
    </div>
  );
}

function IntegrationBlock({
  provider,
  row,
  goals,
  onConnect,
  onReload,
}: {
  provider: Provider;
  row: IntegrationRow | null;
  goals: Goal[];
  onConnect: () => void;
  onReload: () => void;
}) {
  const connected = row !== null && row.enabled;
  const [disconnecting, setDisconnecting] = useState(false);

  async function disconnect() {
    setDisconnecting(true);
    try {
      const res = await fetch(
        `/api/v1/sous-chef/integrations?provider=${provider}`,
        { method: "DELETE" },
      );
      if (res.ok) onReload();
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <PixelCard>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="font-[family-name:var(--font-press-start)] text-sm text-brand">
              {PROVIDER_LABELS[provider]}
            </h2>
            <span
              className={`font-[family-name:var(--font-press-start)] text-[10px] px-2 py-1 border-2 border-brand uppercase tracking-wider ${
                connected ? "bg-gold text-brand" : "bg-surface text-brand/60"
              }`}
            >
              {connected ? "Connected" : "Off"}
            </span>
          </div>
          <div className="flex gap-2">
            {!connected ? (
              <PixelButton onClick={onConnect}>Connect</PixelButton>
            ) : (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <PixelButton variant="danger" disabled={disconnecting}>
                    {disconnecting ? "Disconnecting..." : "Disconnect"}
                  </PixelButton>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Disconnect {PROVIDER_LABELS[provider]}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This removes the saved credential and stops future scans
                      for this provider until you reconnect.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel asChild>
                      <PixelButton variant="ghost">Cancel</PixelButton>
                    </AlertDialogCancel>
                    <AlertDialogAction asChild>
                      <PixelButton variant="danger" onClick={disconnect}>
                        Disconnect
                      </PixelButton>
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>

        {/* Description */}
        <p className="font-[family-name:var(--font-geist-sans)] text-xs text-brand/70">
          {PROVIDER_DESCRIPTIONS[provider]}
        </p>

        {/* Scan timestamps */}
        {row && (row.lastScanOkAt || row.lastScanError) && (
          <div className="font-[family-name:var(--font-geist-mono)] text-[11px] text-brand/60 space-y-1">
            {row.lastScanOkAt && (
              <div suppressHydrationWarning>
                Last OK: {new Date(row.lastScanOkAt).toLocaleString()}
              </div>
            )}
            {row.lastScanError && (
              <div className="text-red-600 break-all">
                Error: {row.lastScanError}
              </div>
            )}
          </div>
        )}

        {/* Goals */}
        <div className="border-t-2 border-brand/20 pt-4">
          <GoalsSection
            provider={provider}
            connected={connected}
            goals={goals}
            onReload={onReload}
          />
        </div>
      </div>
    </PixelCard>
  );
}

function ConnectDialog({
  provider,
  onClose,
  onDone,
}: {
  provider: Provider;
  onClose: () => void;
  onDone: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(body: Record<string, string>) {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/sous-chef/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, ...body }),
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
            Connect {PROVIDER_LABELS[provider]}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="font-[family-name:var(--font-press-start)] text-xs text-brand/60 hover:text-brand"
          >
            ✕
          </button>
        </div>

        {provider === "stripe" && (
          <StripeForm onSubmit={handleSubmit} submitting={submitting} />
        )}
        {provider === "posthog" && (
          <PostHogForm onSubmit={handleSubmit} submitting={submitting} />
        )}
        {provider === "ga4" && (
          <Ga4Form onSubmit={handleSubmit} submitting={submitting} />
        )}

        {error && (
          <p className="font-[family-name:var(--font-geist-mono)] text-xs text-red-600 break-words">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

function StripeForm({
  onSubmit,
  submitting,
}: {
  onSubmit: (body: Record<string, string>) => void;
  submitting: boolean;
}) {
  const [apiKey, setApiKey] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ apiKey });
      }}
      className="space-y-3"
    >
      <a
        href="https://dashboard.stripe.com/apikeys/create?name=brag.fast&permissions%5B%5D=rak_charge_read&permissions%5B%5D=rak_customer_read&permissions%5B%5D=rak_subscription_read&permissions%5B%5D=rak_invoice_read"
        target="_blank"
        rel="noreferrer"
        className="block border-2 border-brand bg-surface p-3 hover:bg-brand/5"
      >
        <p className="font-[family-name:var(--font-geist-sans)] text-sm text-brand font-medium">
          Click here to create a read-only API key →
        </p>
        <ol className="mt-2 space-y-1 font-[family-name:var(--font-geist-sans)] text-xs text-brand/70 list-decimal list-inside">
          <li>Scroll down, click &quot;Create key&quot;</li>
          <li>Don&apos;t change the permissions</li>
          <li>Don&apos;t delete the key or we can&apos;t refresh revenue</li>
        </ol>
      </a>
      <label className="block">
        <span className="font-[family-name:var(--font-geist-sans)] text-xs text-brand">
          Restricted key (rk_...)
        </span>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          required
          placeholder="rk_live_..."
          className="mt-1 w-full border-2 border-brand bg-white px-3 py-2 font-[family-name:var(--font-geist-mono)] text-sm"
        />
      </label>
      <PixelButton type="submit" disabled={submitting || !apiKey}>
        {submitting ? "Saving..." : "Connect"}
      </PixelButton>
    </form>
  );
}

function PostHogForm({
  onSubmit,
  submitting,
}: {
  onSubmit: (body: Record<string, string>) => void;
  submitting: boolean;
}) {
  const [apiKey, setApiKey] = useState("");
  const [projectId, setProjectId] = useState("");
  const [host, setHost] = useState("https://us.posthog.com");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ apiKey, projectId, host });
      }}
      className="space-y-3"
    >
      <p className="font-[family-name:var(--font-geist-sans)] text-xs text-brand/70">
        Create a personal API key in{" "}
        <a
          href="https://app.posthog.com/me/settings"
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          PostHog Settings
        </a>{" "}
        with query + read access on your project.
      </p>
      <label className="block">
        <span className="font-[family-name:var(--font-geist-sans)] text-xs text-brand">
          Personal API key
        </span>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          required
          className="mt-1 w-full border-2 border-brand bg-white px-3 py-2 font-[family-name:var(--font-geist-mono)] text-sm"
        />
      </label>
      <label className="block">
        <span className="font-[family-name:var(--font-geist-sans)] text-xs text-brand">
          Project ID
        </span>
        <input
          type="text"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          required
          placeholder="12345"
          className="mt-1 w-full border-2 border-brand bg-white px-3 py-2 font-[family-name:var(--font-geist-mono)] text-sm"
        />
      </label>
      <label className="block">
        <span className="font-[family-name:var(--font-geist-sans)] text-xs text-brand">
          Host
        </span>
        <select
          value={host}
          onChange={(e) => setHost(e.target.value)}
          className="mt-1 w-full border-2 border-brand bg-white px-3 py-2 font-[family-name:var(--font-geist-mono)] text-sm"
        >
          <option value="https://us.posthog.com">US Cloud</option>
          <option value="https://eu.posthog.com">EU Cloud</option>
        </select>
      </label>
      <PixelButton
        type="submit"
        disabled={submitting || !apiKey || !projectId}
      >
        {submitting ? "Saving..." : "Connect"}
      </PixelButton>
    </form>
  );
}

function Ga4Form({
  onSubmit,
  submitting,
}: {
  onSubmit: (body: Record<string, string>) => void;
  submitting: boolean;
}) {
  const [serviceAccountJson, setServiceAccountJson] = useState("");
  const [propertyId, setPropertyId] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ serviceAccountJson, propertyId });
      }}
      className="space-y-3"
    >
      <p className="font-[family-name:var(--font-geist-sans)] text-xs text-brand/70">
        Create a service account in{" "}
        <a
          href="https://console.cloud.google.com/iam-admin/serviceaccounts"
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          Google Cloud Console
        </a>{" "}
        with <code>Analytics Data API</code> read access. Add its email as a
        viewer on your GA4 property. Paste the downloaded JSON below.
      </p>
      <label className="block">
        <span className="font-[family-name:var(--font-geist-sans)] text-xs text-brand">
          Service-account JSON
        </span>
        <textarea
          value={serviceAccountJson}
          onChange={(e) => setServiceAccountJson(e.target.value)}
          required
          rows={6}
          placeholder={`{"type": "service_account", "client_email": "...", "private_key": "..."}`}
          className="mt-1 w-full border-2 border-brand bg-white px-3 py-2 font-[family-name:var(--font-geist-mono)] text-[11px]"
        />
      </label>
      <label className="block">
        <span className="font-[family-name:var(--font-geist-sans)] text-xs text-brand">
          GA4 Property ID
        </span>
        <input
          type="text"
          value={propertyId}
          onChange={(e) => setPropertyId(e.target.value)}
          required
          placeholder="123456789"
          className="mt-1 w-full border-2 border-brand bg-white px-3 py-2 font-[family-name:var(--font-geist-mono)] text-sm"
        />
      </label>
      <PixelButton
        type="submit"
        disabled={submitting || !serviceAccountJson || !propertyId}
      >
        {submitting ? "Saving..." : "Connect"}
      </PixelButton>
    </form>
  );
}
