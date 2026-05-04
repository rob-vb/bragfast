"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { PixelButton } from "./pixel-button";
import { PixelCard } from "./pixel-card";
import { GitHubSection } from "./github-section";
import { OrgPendingBanner } from "./org-pending-banner";
import type { Plan } from "@/lib/plan-tiers";
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

type SousChefProvider = Exclude<Provider, "buffer" | "postiz">;
type PostingProvider = "buffer" | "postiz";

type IntegrationRow = {
  provider: Provider;
  enabled: boolean;
  lastScanAt: string | null;
  lastScanOkAt: string | null;
  lastScanError: string | null;
  extra: string | null;
};

// ── extra JSON shapes ───────────────────────────────────────────────────────

interface BufferChannel {
  id: string;
  service: string;
  displayName: string;
  isDisconnected?: boolean;
}

interface BufferExtra {
  organizationId?: string;
  channels?: BufferChannel[];
}

interface PostizChannel {
  id: string;
  identifier?: string;
  name?: string;
  profile?: string;
  disabled?: boolean;
}

interface PostizExtra {
  instanceUrl?: string;
  channels?: PostizChannel[];
}

function parseExtra(extra: string | null): unknown {
  if (!extra) return null;
  try {
    return JSON.parse(extra);
  } catch {
    return null;
  }
}

// ── Channel badge list ──────────────────────────────────────────────────────

function ChannelList({
  provider,
  extra,
}: {
  provider: PostingProvider;
  extra: string | null;
}) {
  const parsed = parseExtra(extra);

  if (provider === "buffer") {
    const data = parsed as BufferExtra | null;
    const channels = data?.channels ?? [];
    if (channels.length === 0) {
      return (
        <p className="font-[family-name:var(--font-geist-sans)] text-xs text-brand/50 italic">
          No channels connected — connect channels in Buffer first.
        </p>
      );
    }
    return (
      <div className="flex flex-wrap gap-2">
        {channels.map((ch) => (
          <span
            key={ch.id}
            className={`font-[family-name:var(--font-geist-sans)] text-[11px] px-2 py-1 border border-brand/40 bg-surface ${
              ch.isDisconnected ? "opacity-40 line-through" : ""
            }`}
            title={ch.isDisconnected ? "Disconnected in Buffer" : undefined}
          >
            {ch.service ? `${ch.service} · ` : ""}
            {ch.displayName}
          </span>
        ))}
      </div>
    );
  }

  // postiz
  const data = parsed as PostizExtra | null;
  const channels = data?.channels ?? [];
  if (channels.length === 0) {
    return (
      <p className="font-[family-name:var(--font-geist-sans)] text-xs text-brand/50 italic">
        No channels connected — connect channels in Postiz first.
      </p>
    );
  }
  return (
    <div className="flex flex-wrap gap-2">
      {channels.map((ch) => (
        <span
          key={ch.id}
          className={`font-[family-name:var(--font-geist-sans)] text-[11px] px-2 py-1 border border-brand/40 bg-surface ${
            ch.disabled ? "opacity-40" : ""
          }`}
          title={ch.disabled ? "Disabled in Postiz" : undefined}
        >
          {ch.name ?? ch.identifier ?? ch.id}
          {ch.disabled ? " (disabled)" : ""}
        </span>
      ))}
    </div>
  );
}

// ── PostingProviderBlock ────────────────────────────────────────────────────

function PostingProviderBlock({
  provider,
  row,
  onConnect,
  onReload,
}: {
  provider: PostingProvider;
  row: IntegrationRow | null;
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

  // Derive hostname for Postiz connected state
  let postizHostname: string | null = null;
  if (provider === "postiz" && row?.extra) {
    try {
      const data = JSON.parse(row.extra) as PostizExtra;
      if (data.instanceUrl) {
        postizHostname = new URL(data.instanceUrl).hostname;
      }
    } catch {
      // ignore
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
              <PixelButton onClick={onConnect}>
                Connect {PROVIDER_LABELS[provider]}
              </PixelButton>
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
                      This removes the saved credential and stops future draft
                      pushes for this provider until you reconnect.
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

        {/* Connected details */}
        {connected && (
          <div className="space-y-2">
            {postizHostname && (
              <p className="font-[family-name:var(--font-geist-mono)] text-[11px] text-brand/60">
                Instance: {postizHostname}
              </p>
            )}
            <ChannelList provider={provider} extra={row?.extra ?? null} />
          </div>
        )}
      </div>
    </PixelCard>
  );
}

// ── PostingProvidersSection ─────────────────────────────────────────────────

function PostingProvidersSection({
  rows,
  onConnect,
  onReload,
}: {
  rows: IntegrationRow[];
  onConnect: (provider: PostingProvider) => void;
  onReload: () => void;
}) {
  const byProvider = new Map<Provider, IntegrationRow>(
    rows.map((r) => [r.provider, r]),
  );

  return (
    <div className="space-y-4">
      <h2 className="font-[family-name:var(--font-press-start)] text-sm text-brand">
        Posting
      </h2>
      {(["buffer", "postiz"] as PostingProvider[]).map((provider) => (
        <PostingProviderBlock
          key={provider}
          provider={provider}
          row={byProvider.get(provider) ?? null}
          onConnect={() => onConnect(provider)}
          onReload={onReload}
        />
      ))}
    </div>
  );
}

// ── Main client ─────────────────────────────────────────────────────────────

export function SousChefClient({
  github,
  plan: _plan,
}: {
  github: GitHubPropShape;
  plan: Plan;
}) {
  const [rows, setRows] = useState<IntegrationRow[] | null>(null);
  const [activeForm, setActiveForm] = useState<Provider | null>(null);

  const searchParams = useSearchParams();
  const router = useRouter();

  const reload = useCallback(async () => {
    const intRes = await fetch("/api/v1/sous-chef/integrations");
    if (intRes.ok) {
      const data = (await intRes.json()) as { integrations: IntegrationRow[] };
      setRows(data.integrations);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount
    reload();
  }, [reload]);

  // Handle ?connected= and ?error= query params left over from prior flows.
  // Buffer no longer redirects (paste-key flow now); kept generic.
  useEffect(() => {
    const connected = searchParams.get("connected");
    const error = searchParams.get("error");

    if (connected) {
      const label =
        connected === "buffer"
          ? "Buffer"
          : connected === "postiz"
            ? "Postiz"
            : connected;
      toast.success(`${label} connected`, {
        description: "Your posting provider is now active.",
      });
      const url = new URL(window.location.href);
      url.searchParams.delete("connected");
      router.replace(url.pathname + (url.search !== "?" ? url.search : ""), {
        scroll: false,
      });
    }

    if (error) {
      toast.error("Connection failed", { description: `Error: ${error}` });
      const url = new URL(window.location.href);
      url.searchParams.delete("error");
      router.replace(url.pathname + (url.search !== "?" ? url.search : ""), {
        scroll: false,
      });
    }
  }, [searchParams, router]);

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

      <OrgPendingBanner appSlug={github.appSlug} />

      <div className="space-y-4">
        <h2 className="font-[family-name:var(--font-press-start)] text-sm text-brand">
          GitHub
        </h2>
        <PixelCard>
          <GitHubSection
            installations={github.installations}
            appSlug={github.appSlug}
          />
        </PixelCard>
      </div>

      <PostingProvidersSection
        rows={rows ?? []}
        onConnect={(p) => setActiveForm(p)}
        onReload={reload}
      />

      <div className="space-y-4">
        <h2 className="font-[family-name:var(--font-press-start)] text-sm text-brand">
          Billing
        </h2>
        <IntegrationBlock
          provider="stripe"
          row={byProvider.get("stripe") ?? null}
          onConnect={() => setActiveForm("stripe")}
          onReload={reload}
        />
      </div>

      <div className="space-y-4">
        <h2 className="font-[family-name:var(--font-press-start)] text-sm text-brand">
          Analytics
        </h2>
        {(["posthog", "ga4"] as SousChefProvider[]).map((provider) => (
          <IntegrationBlock
            key={provider}
            provider={provider}
            row={byProvider.get(provider) ?? null}
            onConnect={() => setActiveForm(provider)}
            onReload={reload}
          />
        ))}
      </div>

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
  onConnect,
  onReload,
}: {
  provider: SousChefProvider;
  row: IntegrationRow | null;
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

      </div>
    </PixelCard>
  );
}
