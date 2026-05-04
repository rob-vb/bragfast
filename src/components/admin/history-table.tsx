"use client";

import { useState, useRef, useEffect } from "react";
import { PixelBadge } from "@/components/admin/pixel-badge";
import { PixelButton } from "@/components/admin/pixel-button";
import {
  PixelEventCard,
  PixelEventList,
} from "@/components/admin/pixel-event-card";

type Release = {
  _id: string;
  externalId: string;
  template: string;
  status: "completed" | "pending" | "failed";
  output?: "image" | "video";
  images?: unknown;
  videos?: unknown;
  socialCopy?: string;
  credits_used: number;
  metadata?: string;
  webhook_url?: string;
  created_at: string;
  completed_at?: string;
  source?: "api" | "github" | "demo" | "dashboard";
};

function buildResponseBody(r: Release) {
  return {
    cook_id: r.externalId,
    output: r.output ?? "image",
    status: r.status,
    images: r.images ?? null,
    videos: r.videos ?? null,
    credits_used: r.credits_used,
    created_at: r.created_at,
    ...(r.completed_at ? { completed_at: r.completed_at } : {}),
    ...(r.metadata ? { metadata: r.metadata } : {}),
    ...(r.webhook_url ? { webhook_url: r.webhook_url } : {}),
    ...(r.source ? { source: r.source } : {}),
  };
}

function DownloadButton({ releaseId, status }: { releaseId: string; status: string }) {
  const [downloading, setDownloading] = useState(false);
  const isDisabled = status !== "completed";

  async function handleDownload(e: React.MouseEvent) {
    e.stopPropagation();
    if (isDisabled || downloading) return;
    setDownloading(true);
    try {
      const res = await fetch(`/api/v1/cook/${releaseId}/download`);
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${releaseId}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed:", err);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <PixelButton
      onClick={handleDownload}
      disabled={isDisabled || downloading}
      aria-busy={downloading}
      title={isDisabled ? "No images to download" : undefined}
    >
      {downloading ? "..." : "Download"}
    </PixelButton>
  );
}

function SocialCopySection({ release }: { release: Release }) {
  const [editing, setEditing] = useState(false);
  const [twitter, setTwitter] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const copy = release.socialCopy ? (() => {
    try { return JSON.parse(release.socialCopy!) as { twitter: string; linkedin: string }; }
    catch { return null; }
  })() : null;

  if (!copy || (!copy.twitter && !copy.linkedin)) return null;

  function startEdit(e: React.MouseEvent) {
    e.stopPropagation();
    setTwitter(copy!.twitter);
    setLinkedin(copy!.linkedin);
    setEditing(true);
  }

  async function save(e: React.MouseEvent) {
    e.stopPropagation();
    setSaving(true);
    try {
      await fetch(`/api/v1/cook/${release.externalId}/copy`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ twitter, linkedin }),
      });
      copy!.twitter = twitter;
      copy!.linkedin = linkedin;
      setEditing(false);
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setSaving(false);
    }
  }

  function copyToClipboard(text: string, platform: string, e: React.MouseEvent) {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopied(platform);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="border-2 border-brand bg-white p-4 shadow-[4px_4px_0_var(--color-brand)]">
      <div className="flex items-center justify-between mb-3">
        <span className="font-[family-name:var(--font-press-start)] text-[10px] text-brand">
          Social Copy
        </span>
        {!editing && (
          <button
            onClick={startEdit}
            className="font-[family-name:var(--font-press-start)] text-[8px] text-brand/60 hover:text-gold transition-colors"
          >
            Edit
          </button>
        )}
      </div>
      {editing ? (
        <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
          <div>
            <label className="text-xs text-brand/60 mb-1 block">Twitter / X</label>
            <textarea
              value={twitter}
              onChange={(e) => setTwitter(e.target.value)}
              maxLength={280}
              rows={3}
              className="w-full border-2 border-brand p-2 font-mono text-xs bg-white resize-none focus:outline-none focus:ring-2 focus:ring-gold"
            />
          </div>
          <div>
            <label className="text-xs text-brand/60 mb-1 block">LinkedIn</label>
            <textarea
              value={linkedin}
              onChange={(e) => setLinkedin(e.target.value)}
              maxLength={500}
              rows={4}
              className="w-full border-2 border-brand p-2 font-mono text-xs bg-white resize-none focus:outline-none focus:ring-2 focus:ring-gold"
            />
          </div>
          <div className="flex gap-2">
            <PixelButton onClick={save} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </PixelButton>
            <PixelButton variant="ghost" onClick={(e) => { e.stopPropagation(); setEditing(false); }}>
              Cancel
            </PixelButton>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {copy.twitter && (
            <div className="flex items-start gap-3 border border-brand/10 p-3">
              <span className="text-xs font-bold text-brand/60 shrink-0" aria-label="Twitter draft">X</span>
              <p className="text-xs text-brand flex-1">{copy.twitter}</p>
              <button
                onClick={(e) => copyToClipboard(copy.twitter, "twitter", e)}
                className="font-[family-name:var(--font-press-start)] text-[8px] text-brand/40 hover:text-gold transition-colors shrink-0"
                aria-live="polite"
              >
                {copied === "twitter" ? "Copied!" : "Copy"}
              </button>
            </div>
          )}
          {copy.linkedin && (
            <div className="flex items-start gap-3 border border-brand/10 p-3">
              <span className="text-xs font-bold text-brand/60 shrink-0" aria-label="LinkedIn draft">in</span>
              <p className="text-xs text-brand flex-1 whitespace-pre-line">{copy.linkedin}</p>
              <button
                onClick={(e) => copyToClipboard(copy.linkedin, "linkedin", e)}
                className="font-[family-name:var(--font-press-start)] text-[8px] text-brand/40 hover:text-gold transition-colors shrink-0"
                aria-live="polite"
              >
                {copied === "linkedin" ? "Copied!" : "Copy"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ReleaseCard({ release, defaultOpen }: { release: Release; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  const ref = useRef<HTMLDivElement>(null);
  const response = buildResponseBody(release);

  useEffect(() => {
    if (defaultOpen && ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [defaultOpen]);

  return (
    <div ref={ref}>
      <PixelEventCard
        header={
          <>
            <button
              type="button"
              onClick={() => setOpen(!open)}
              className="flex items-center gap-2 font-[family-name:var(--font-geist-mono)] text-[12px] text-brand hover:text-gold transition-colors"
              aria-expanded={open}
              aria-label={open ? "Collapse details" : "Expand details"}
            >
              <span className="inline-block w-3 text-brand/60">
                {open ? "▼" : "▶"}
              </span>
              {release.externalId}
            </button>
            {release.source === "github" && (
              <PixelBadge label="GitHub" variant="github" />
            )}
            <PixelBadge status={release.status} />
            <span className="font-[family-name:var(--font-geist-mono)] text-[11px] text-brand/60">
              {release.template}
            </span>
            <span className="ml-auto font-[family-name:var(--font-geist-mono)] text-[11px] text-brand/60 whitespace-nowrap">
              {new Date(release.created_at).toLocaleDateString()}
            </span>
          </>
        }
        meta={
          <>
            <span>credits: {release.credits_used}</span>
            <span>·</span>
            <span>{release.output ?? "image"}</span>
            {release.completed_at && (
              <>
                <span>·</span>
                <span>completed {new Date(release.completed_at).toLocaleString()}</span>
              </>
            )}
          </>
        }
        actions={
          <DownloadButton releaseId={release.externalId} status={release.status} />
        }
      >
        {open && (
          <div className="space-y-3">
            <SocialCopySection release={release} />
            <div className="border-2 border-brand bg-brand shadow-[4px_4px_0_var(--color-brand)]">
              <div className="flex items-center justify-between border-b border-brand/10 px-3 py-2">
                <span className="font-[family-name:var(--font-press-start)] text-[8px] text-gold">
                  Response
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(
                      JSON.stringify(response, null, 2)
                    );
                  }}
                  className="font-[family-name:var(--font-press-start)] text-[8px] text-[var(--color-surface)]/60 hover:text-gold transition-colors"
                >
                  Copy
                </button>
              </div>
              <pre className="overflow-x-auto p-3 font-mono text-xs leading-relaxed text-[var(--color-surface)]/80 whitespace-pre-wrap break-all max-w-full">
                {JSON.stringify(response, null, 2)}
              </pre>
            </div>
          </div>
        )}
        {!open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="font-[family-name:var(--font-geist-mono)] text-[11px] text-brand/45 hover:text-brand transition-colors"
          >
            Show response →
          </button>
        )}
      </PixelEventCard>
    </div>
  );
}

export function HistoryTable({ releases, highlightId }: { releases: Release[]; highlightId?: string }) {
  return (
    <PixelEventList>
      {releases.map((r) => (
        <ReleaseCard key={r._id} release={r} defaultOpen={r.externalId === highlightId} />
      ))}
    </PixelEventList>
  );
}
