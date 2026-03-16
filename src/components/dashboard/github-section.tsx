"use client";

import { useState } from "react";
import { PixelButton } from "@/components/dashboard/pixel-button";
import { PixelBadge } from "@/components/dashboard/pixel-badge";
import { RepoConfigList } from "@/components/dashboard/github-repo-list";
import { SkippedReleasesLog } from "@/components/dashboard/github-skipped-log";

type Installation = {
  _id: string;
  installationId: number;
  accountLogin: string;
  accountType: string;
  enabled: boolean;
  status: string;
};
type Brand = { externalId: string; name: string };
type Template = { externalId: string; name: string };
type SkippedRelease = {
  _id: string;
  repoFullName: string;
  releaseTag: string;
  releaseName?: string;
  reason: string;
  created_at: string;
};

type Props = {
  installations: Installation[];
  brands: Brand[];
  templates: Template[];
  skippedReleases: SkippedRelease[];
  appSlug: string;
};

export function GitHubSection({ installations, brands, templates, skippedReleases, appSlug }: Props) {
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
          Connect your GitHub account to auto-generate images when you publish a release.
        </p>
        <a
          href={`https://github.com/apps/${appSlug}/installations/new`}
          className="inline-block"
        >
          <PixelButton>Install GitHub App</PixelButton>
        </a>
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

      {enabled && (
        <RepoConfigList
          installationId={active.installationId}
          brands={brands}
          templates={templates}
        />
      )}

      <SkippedReleasesLog releases={skippedReleases} />
    </div>
  );
}
