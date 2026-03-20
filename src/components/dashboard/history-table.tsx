"use client";

import { useState } from "react";
import { PixelBadge } from "@/components/dashboard/pixel-badge";
import { PixelTable } from "@/components/dashboard/pixel-table";
import { PixelButton } from "@/components/dashboard/pixel-button";

type Release = {
  _id: string;
  externalId: string;
  template: string;
  status: "completed" | "pending" | "pending_review" | "failed" | "dismissed";
  images?: unknown;
  socialCopy?: string;
  credits_used: number;
  metadata?: string;
  webhook_url?: string;
  created_at: string;
  completed_at?: string;
  source?: "api" | "github";
  sourceMetadata?: string;
};

function buildResponseBody(r: Release) {
  return {
    cook_id: r.externalId,
    status: r.status,
    images: r.images ?? null,
    credits_used: r.credits_used,
    created_at: r.created_at,
    ...(r.completed_at ? { completed_at: r.completed_at } : {}),
    ...(r.metadata ? { metadata: r.metadata } : {}),
    ...(r.webhook_url ? { webhook_url: r.webhook_url } : {}),
    ...(r.source ? { source: r.source } : {}),
    ...(r.sourceMetadata ? (() => {
      try { return { sourceMetadata: JSON.parse(r.sourceMetadata) }; } catch { return {}; }
    })() : {}),
  };
}

function DownloadButton({ releaseId, status }: { releaseId: string; status: string }) {
  const [downloading, setDownloading] = useState(false);
  const isPending = status === "pending" || status === "pending_review";

  async function handleDownload(e: React.MouseEvent) {
    e.stopPropagation();
    if (isPending || downloading) return;
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
      disabled={isPending || downloading}
      aria-busy={downloading}
      title={isPending ? "Images still cooking..." : undefined}
    >
      {downloading ? "Preparing ZIP..." : "Download All"}
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
    <div className="mt-3 border-2 border-brand bg-white p-4 shadow-[4px_4px_0_var(--color-brand)]">
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

function ExpandableRow({ release }: { release: Release }) {
  const [open, setOpen] = useState(false);
  const response = buildResponseBody(release);

  return (
    <>
      <tr
        className="hover:bg-gold/5 cursor-pointer"
        onClick={() => setOpen(!open)}
      >
        <td className="px-4 py-3 font-mono text-xs">
          <span className="inline-block w-4 text-brand/40 mr-1">
            {open ? "▼" : "▶"}
          </span>
          {release.externalId}
          {release.source === "github" && (
            <span className="ml-2">
              <PixelBadge label="GitHub" variant="github" />
            </span>
          )}
        </td>
        <td className="px-4 py-3 text-xs">{release.template}</td>
        <td className="px-4 py-3">
          <PixelBadge status={release.status} />
        </td>
        <td className="px-4 py-3 text-xs">{release.credits_used}</td>
        <td className="px-4 py-3 text-xs">
          {new Date(release.created_at).toLocaleDateString()}
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={5} className="px-4 py-0">
            {/* Action bar */}
            <div className="flex justify-end mt-1 mb-2">
              <DownloadButton releaseId={release.externalId} status={release.status} />
            </div>

            {/* Social copy */}
            <SocialCopySection release={release} />

            {/* Response JSON */}
            <div className="mb-4 mt-3 border-2 border-brand bg-brand shadow-[4px_4px_0_var(--color-brand)]">
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
          </td>
        </tr>
      )}
    </>
  );
}

export function HistoryTable({ releases }: { releases: Release[] }) {
  return (
    <PixelTable headers={["ID", "Template", "Status", "Credits", "Date"]}>
      {releases.map((r) => (
        <ExpandableRow key={r._id} release={r} />
      ))}
    </PixelTable>
  );
}
