"use client";

import { useState } from "react";
import { PixelButton } from "@/components/dashboard/pixel-button";
import { PixelCard } from "@/components/dashboard/pixel-card";

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
};

type Props = {
  repo: { full_name: string; name: string; private: boolean; description: string | null };
  config: RepoConfig | null;
  installationId: number;
  brands: Brand[];
  templates: Template[];
  onSaved: () => void;
};

const FORMAT_OPTIONS = ["landscape", "square", "portrait"] as const;

export function RepoConfigCard({ repo, config, installationId, brands, templates, onSaved }: Props) {
  const [enabled, setEnabled] = useState(config?.enabled ?? false);
  const [brandId, setBrandId] = useState(config?.brandId ?? "");
  const [template, setTemplate] = useState(config?.template ?? "standard-browser");
  const [formats, setFormats] = useState<string[]>(config?.formats ?? ["landscape"]);
  const [skipPrereleases, setSkipPrereleases] = useState(config?.skipPrereleases ?? true);
  const [tagFilter, setTagFilter] = useState(config?.tagFilter ?? "");
  const [webhookUrl, setWebhookUrl] = useState(config?.webhookUrl ?? "");
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
        }),
      });
      if (!res.ok) console.error("Save failed:", await res.text());
    } finally {
      setSaving(false);
      onSaved();
    }
  }

  const inputClass =
    "w-full border-2 border-brand bg-white px-3 py-2 text-sm text-brand placeholder:text-brand/40 focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)]";

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
        <label className="flex items-center gap-2 cursor-pointer">
          <span className="text-xs text-brand/60">Enabled</span>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="accent-[var(--color-gold)]"
          />
        </label>
      </div>

      {expanded && (
        <div className="mt-4 space-y-3">
          {repo.description && (
            <p className="text-xs text-brand/50">{repo.description}</p>
          )}

          <div>
            <label className="block text-xs text-brand/60 mb-1">Brand</label>
            <select className={inputClass} value={brandId} onChange={(e) => setBrandId(e.target.value)}>
              <option value="">None (fallback colors)</option>
              {brands.map((b) => (
                <option key={b.externalId} value={b.externalId}>{b.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-brand/60 mb-1">Template</label>
            <select className={inputClass} value={template} onChange={(e) => setTemplate(e.target.value)}>
              {templates.map((t) => (
                <option key={t.externalId} value={t.externalId}>{t.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-brand/60 mb-1">Formats</label>
            <div className="flex gap-3">
              {FORMAT_OPTIONS.map((f) => (
                <label key={f} className="flex items-center gap-1 text-xs text-brand cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formats.includes(f)}
                    onChange={() => toggleFormat(f)}
                    className="accent-[var(--color-gold)]"
                  />
                  {f}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-brand/60 mb-1">Tag filter</label>
            <input
              className={inputClass}
              placeholder="v*"
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
            />
          </div>

          <label className="flex items-center gap-2 text-xs text-brand cursor-pointer">
            <input
              type="checkbox"
              checked={skipPrereleases}
              onChange={(e) => setSkipPrereleases(e.target.checked)}
              className="accent-[var(--color-gold)]"
            />
            Skip pre-releases
          </label>

          <div>
            <label className="block text-xs text-brand/60 mb-1">Webhook URL (optional)</label>
            <input
              className={inputClass}
              placeholder="https://your-app.com/webhooks/bragfast"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
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
