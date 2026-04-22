"use client";

import { useState, useEffect, useCallback } from "react";
import { RepoConfigCard } from "@/components/admin/github-repo-card";

type Repo = { full_name: string; name: string; private: boolean; description: string | null };
type RepoConfig = {
  installationId: number;
  repoFullName: string;
  enabled: boolean;
  notifyOnPrMerge?: boolean;
};

type Props = {
  installationId: number;
};

export function RepoConfigList({ installationId }: Props) {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [configs, setConfigs] = useState<RepoConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [reposRes, configsRes] = await Promise.all([
        fetch("/api/github/repos"),
        fetch("/api/github/configs"),
      ]);
      if (!reposRes.ok) throw new Error("Failed to fetch repos");
      const reposData = await reposRes.json();
      setRepos(reposData.repos);
      setConfigs(await configsRes.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return <p className="text-xs text-brand/60 py-4">Loading repositories...</p>;
  }

  if (error) {
    return <p className="text-xs text-red-600 py-4">{error}</p>;
  }

  const configuredNames = new Set(configs.filter((c) => c.enabled).map((c) => c.repoFullName));
  const sorted = [...repos].sort((a, b) => {
    const aConf = configuredNames.has(a.full_name) ? 0 : 1;
    const bConf = configuredNames.has(b.full_name) ? 0 : 1;
    if (aConf !== bConf) return aConf - bConf;
    return a.full_name.localeCompare(b.full_name);
  });

  return (
    <div className="mt-4 space-y-3">
      <p className="text-xs text-brand/60">{repos.length} repositories</p>
      {sorted.map((repo) => (
        <RepoConfigCard
          key={repo.full_name}
          repo={repo}
          config={configs.find((c) => c.repoFullName === repo.full_name) ?? null}
          installationId={installationId}
          onSaved={loadData}
        />
      ))}
    </div>
  );
}
