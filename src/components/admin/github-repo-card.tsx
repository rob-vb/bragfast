"use client";

import { useState } from "react";
import { PixelButton } from "@/components/admin/pixel-button";
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
  const [notifyOnPrMerge, setNotifyOnPrMerge] = useState(config?.notifyOnPrMerge ?? false);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(!!config?.enabled);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/github/configs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          installationId,
          repoFullName: repo.full_name,
          enabled,
          notifyOnPrMerge,
        }),
      });
      if (!res.ok) console.error("Save failed:", await res.text());
    } finally {
      setSaving(false);
      onSaved();
    }
  }

  return (
    <PixelCard>
      <div className="flex items-center justify-between">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-left"
        >
          <span className="text-xs text-brand/40">{expanded ? "▼" : "▶"}</span>
          <span className="font-mono text-sm text-brand font-bold">{repo.full_name}</span>
          {repo.private && (
            <span className="text-[10px] text-brand/40 border border-brand/20 px-1">private</span>
          )}
        </button>
        <div className="flex items-center gap-2">
          <Label htmlFor={`enabled-${repo.full_name}`} className="text-xs text-brand/60">Enabled</Label>
          <Switch
            id={`enabled-${repo.full_name}`}
            checked={enabled}
            onCheckedChange={setEnabled}
          />
        </div>
      </div>

      {expanded && (
        <div className="mt-4 space-y-3">
          {repo.description && (
            <p className="text-xs text-brand/50">{repo.description}</p>
          )}

          <div className="flex items-center gap-2">
            <Switch
              id={`notify-pr-merge-${repo.full_name}`}
              checked={notifyOnPrMerge}
              onCheckedChange={setNotifyOnPrMerge}
            />
            <Label htmlFor={`notify-pr-merge-${repo.full_name}`} className="text-xs text-brand cursor-pointer">
              Draft a brag post when a PR is merged to the default branch
            </Label>
          </div>

          <PixelButton onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </PixelButton>
        </div>
      )}
    </PixelCard>
  );
}
