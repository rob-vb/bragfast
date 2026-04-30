"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PixelCard } from "@/components/admin/pixel-card";

type IntegrationRow = {
  provider: string;
  enabled: boolean;
};

type GitHubInstallation = {
  installationId: number;
  status: string;
};

type RepoConfig = {
  notifyOnPrMerge?: boolean;
  enabled?: boolean;
};

const POSTING = ["buffer", "postiz"] as const;

export function DashboardSourcesWidget() {
  const [integrations, setIntegrations] = useState<IntegrationRow[] | null>(null);
  const [githubActive, setGithubActive] = useState<boolean | null>(null);
  const [optedInRepos, setOptedInRepos] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [intRes, ghRes, cfgRes] = await Promise.all([
        fetch("/api/v1/sous-chef/integrations"),
        fetch("/api/github/installations"),
        fetch("/api/github/configs"),
      ]);
      if (cancelled) return;
      if (intRes.ok) {
        const data = (await intRes.json()) as { integrations: IntegrationRow[] };
        setIntegrations(data.integrations);
      } else {
        setIntegrations([]);
      }
      if (ghRes.ok) {
        const data = (await ghRes.json()) as GitHubInstallation[];
        setGithubActive(data.some((i) => i.status === "active"));
      } else {
        setGithubActive(false);
      }
      if (cfgRes.ok) {
        const data = (await cfgRes.json()) as RepoConfig[];
        setOptedInRepos(data.filter((c) => c.notifyOnPrMerge).length);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const isLoaded = integrations !== null && githubActive !== null;
  const byProvider = new Map((integrations ?? []).map((r) => [r.provider, r]));
  const postingConnected = POSTING.filter(
    (p) => byProvider.get(p)?.enabled,
  ).length;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-[family-name:var(--font-press-start)] text-sm text-brand">
          Sources
        </h2>
        <Link
          href="/admin/sous-chef"
          className="text-xs underline underline-offset-4 hover:text-gold"
        >
          Manage →
        </Link>
      </div>
      {!isLoaded ? (
        <div className="h-24 border-2 border-dashed border-brand/30 bg-surface animate-pixel-skeleton" />
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <PixelCard>
            <p className="font-[family-name:var(--font-press-start)] text-xs text-brand">
              GitHub
            </p>
            <p className="mt-2 text-xs text-brand/70">
              {githubActive
                ? `${optedInRepos} repo${optedInRepos === 1 ? "" : "s"} watching PR merges`
                : "Not connected"}
            </p>
          </PixelCard>
          <PixelCard>
            <p className="font-[family-name:var(--font-press-start)] text-xs text-brand">
              Posting
            </p>
            <p className="mt-2 text-xs text-brand/70">
              {postingConnected === 0
                ? "No publisher connected"
                : `${postingConnected} of ${POSTING.length} connected`}
            </p>
          </PixelCard>
        </div>
      )}
    </div>
  );
}
