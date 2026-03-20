"use client";

import { useState } from "react";
import { PixelButton } from "@/components/dashboard/pixel-button";
import { PixelCard } from "@/components/dashboard/pixel-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Brand = { externalId: string; name: string };
type Template = { externalId: string; name: string };

type RepoConfig = {
  installationId: number;
  repoFullName: string;
  enabled: boolean;
  brandId?: string;
  template?: string;
  formats?: string[];
  skipPrereleases: boolean;
  tagFilter?: string;
  webhookUrl?: string;
  autoApprove?: boolean;
  maxSlides?: number;
};

type Props = {
  repo: { full_name: string; name: string; private: boolean; description: string | null };
  config: RepoConfig | null;
  installationId: number;
  brands: Brand[];
  templates: Template[];
  onSaved: () => void;
};

const FORMAT_OPTIONS = ["landscape", "square", "portrait", "og"] as const;

export function RepoConfigCard({ repo, config, installationId, brands, templates, onSaved }: Props) {
  const [enabled, setEnabled] = useState(config?.enabled ?? false);
  const [brandId, setBrandId] = useState(config?.brandId ?? "");
  const [template, setTemplate] = useState(config?.template ?? "standard-browser");
  const [formats, setFormats] = useState<string[]>(config?.formats ?? ["landscape"]);
  const [skipPrereleases, setSkipPrereleases] = useState(config?.skipPrereleases ?? true);
  const [tagFilter, setTagFilter] = useState(config?.tagFilter ?? "");
  const [webhookUrl, setWebhookUrl] = useState(config?.webhookUrl ?? "");
  const [autoApprove, setAutoApprove] = useState(config?.autoApprove ?? false);
  const [maxSlides, setMaxSlides] = useState(config?.maxSlides ?? 1);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(!!config?.enabled);

  function toggleFormat(f: string) {
    setFormats((prev) =>
      prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]
    );
  }

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
          brandId: brandId || undefined,
          template,
          formats,
          skipPrereleases,
          tagFilter: tagFilter || undefined,
          webhookUrl: webhookUrl || undefined,
          autoApprove,
          maxSlides,
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

          <div className="space-y-1">
            <Label className="text-xs text-brand/60">Brand</Label>
            <Select value={brandId || "__none__"} onValueChange={(v) => setBrandId(v === "__none__" ? "" : v)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None (fallback colors)</SelectItem>
                {brands.map((b) => (
                  <SelectItem key={b.externalId} value={b.externalId}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-brand/60">Template</Label>
            <Select value={template} onValueChange={setTemplate}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.externalId} value={t.externalId}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-brand/60">Formats</Label>
            <div className="flex gap-3">
              {FORMAT_OPTIONS.map((f) => (
                <div key={f} className="flex items-center gap-1.5">
                  <Checkbox
                    id={`format-${f}-${repo.full_name}`}
                    checked={formats.includes(f)}
                    onCheckedChange={() => toggleFormat(f)}
                  />
                  <Label htmlFor={`format-${f}-${repo.full_name}`} className="text-xs text-brand cursor-pointer">{f}</Label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-brand/60">Tag filter</Label>
            <Input placeholder="v*" value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} />
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id={`skip-prereleases-${repo.full_name}`}
              checked={skipPrereleases}
              onCheckedChange={setSkipPrereleases}
            />
            <Label htmlFor={`skip-prereleases-${repo.full_name}`} className="text-xs text-brand cursor-pointer">Skip pre-releases</Label>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-brand/60">Webhook URL (optional)</Label>
            <Input placeholder="https://your-app.com/webhooks/bragfast" value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} />
          </div>

          {/* Auto-approve */}
          <div className="flex items-center gap-2">
            <Switch
              id={`auto-approve-${repo.full_name}`}
              checked={autoApprove}
              onCheckedChange={setAutoApprove}
            />
            <Label htmlFor={`auto-approve-${repo.full_name}`} className="text-xs text-brand cursor-pointer">Auto-approve (skip manual review)</Label>
          </div>

          {/* Max slides */}
          <div className="space-y-1">
            <Label className="text-xs text-brand/60">Max slides per release</Label>
            <Input
              type="number"
              min={1}
              max={5}
              className="max-w-20"
              value={maxSlides}
              onChange={(e) => setMaxSlides(Math.max(1, Math.min(5, Number(e.target.value))))}
            />
          </div>

          <PixelButton onClick={handleSave} disabled={saving || formats.length === 0}>
            {saving ? "Saving..." : "Save"}
          </PixelButton>
        </div>
      )}
    </PixelCard>
  );
}
