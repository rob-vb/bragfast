"use client";

import { useState } from "react";
import posthog from "posthog-js";
import { PixelButton } from "@/components/admin/pixel-button";
import { PixelBadge } from "@/components/admin/pixel-badge";
import { RepoConfigList } from "@/components/admin/github-repo-list";

type Installation = {
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

type Props = {
  installations: Installation[];
  appSlug: string;
};

export function GitHubSection({ installations, appSlug }: Props) {
  const active = installations.find((i) => i.status === "active");
  const [enabled, setEnabled] = useState(active?.enabled ?? false);
  const [toggling, setToggling] = useState(false);

  async function handleToggle() {
    if (!active) return;
    setToggling(true);
    await fetch("/api/github/installations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ installationId: active.installationId, enabled: !enabled }),
    });
    setEnabled(!enabled);
    setToggling(false);
  }

  if (!active) {
    return (
      <div className="text-center py-6">
        <p className="text-sm text-brand/60 mb-4">
          Connect GitHub to draft brag posts when PRs merge to your default branch.
        </p>
        <a
          href={`https://github.com/apps/${appSlug}/installations/new`}
          className="inline-block"
          onClick={() => posthog.capture("github_app_install_started")}
        >
          <PixelButton>Install GitHub App</PixelButton>
        </a>
        <p className="mt-3 text-xs text-brand/60">
          On the next screen, choose <span className="font-bold">Only select repositories</span> and pick the repos you want to brag about.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm text-brand font-bold">{active.accountLogin}</span>
          <PixelBadge label={active.accountType} variant="active" />
          <PixelBadge
            label={enabled ? "enabled" : "disabled"}
            variant={enabled ? "active" : "suspended"}
          />
        </div>
        <div className="flex gap-2">
          <PixelButton variant="ghost" onClick={handleToggle} disabled={toggling}>
            {enabled ? "Disable" : "Enable"}
          </PixelButton>
          <a
            href={`https://github.com/settings/installations/${active.installationId}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <PixelButton variant="ghost">Manage on GitHub</PixelButton>
          </a>
        </div>
      </div>

      {(active.lastScanOkAt || active.lastScanError) && (
        <div className="space-y-1 font-mono text-xs text-brand/60">
          {active.lastScanOkAt && (
            <p suppressHydrationWarning>Last GitHub stars OK: {new Date(active.lastScanOkAt).toLocaleString()}</p>
          )}
          {active.lastScanError && (
            <p className="break-all text-red-600">
              Last GitHub stars error: {active.lastScanError}
            </p>
          )}
        </div>
      )}

      {enabled && (
        <RepoConfigList installationId={active.installationId} />
      )}
    </div>
  );
}
