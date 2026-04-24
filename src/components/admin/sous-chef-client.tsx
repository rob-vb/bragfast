"use client";

import { useState, useEffect, useCallback } from "react";
import { PixelButton } from "./pixel-button";
import { PixelCard } from "./pixel-card";
import { GitHubSection } from "./github-section";
import { GoalsSection } from "./goals-section";
import type { Goal } from "./goals-section";
import {
  ConnectDialog,
  PROVIDER_LABELS,
  PROVIDER_DESCRIPTIONS,
  type Provider,
} from "./integration-forms";
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

type IntegrationRow = {
  provider: Provider;
  enabled: boolean;
  lastScanAt: string | null;
  lastScanOkAt: string | null;
  lastScanError: string | null;
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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount
    reload();
  }, [reload]);

  const githubConnected = github.installations.some(
    (i) => i.status === "active" && i.enabled,
  );

  const byProvider = new Map<Provider, IntegrationRow>(
    (rows ?? []).map((r) => [r.provider, r]),
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
