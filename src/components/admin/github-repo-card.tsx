"use client";

import { useState } from "react";
import { PixelCard } from "@/components/admin/pixel-card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type RepoConfig = {
  installationId: number;
  repoFullName: string;
  enabled: boolean;
  notifyOnPrMerge?: boolean;
};

type Props = {
  repo: { full_name: string; name: string; private: boolean; description: string | null };
  config: RepoConfig | null;
  installationId: number;
  onSaved: () => void;
};

export function RepoConfigCard({ repo, config, installationId, onSaved }: Props) {
  const [enabled, setEnabled] = useState(config?.enabled ?? false);
  const [saving, setSaving] = useState(false);

  async function persist(nextEnabled: boolean) {
    setSaving(true);
    try {
      const res = await fetch("/api/github/configs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          installationId,
          repoFullName: repo.full_name,
          enabled: nextEnabled,
          // Enabled = always draft on PR merge. No separate toggle.
          notifyOnPrMerge: nextEnabled,
        }),
      });
      if (!res.ok) console.error("Save failed:", await res.text());
    } finally {
      setSaving(false);
      onSaved();
    }
  }

  function handleToggle(next: boolean) {
    setEnabled(next);
    void persist(next);
  }

  return (
    <PixelCard>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm text-brand font-bold">{repo.full_name}</span>
          {repo.private && (
            <span className="text-[10px] text-brand/40 border border-brand/20 px-1">private</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor={`enabled-${repo.full_name}`} className="text-xs text-brand/60">
            {saving ? "Saving..." : "Enabled"}
          </Label>
          <Switch
            id={`enabled-${repo.full_name}`}
            checked={enabled}
            onCheckedChange={handleToggle}
            disabled={saving}
          />
        </div>
      </div>

      {repo.description && (
        <div className="mt-4">
          <p className="text-xs text-brand/50">{repo.description}</p>
        </div>
      )}
    </PixelCard>
  );
}
