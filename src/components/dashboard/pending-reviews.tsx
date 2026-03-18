"use client";

import { useState } from "react";
import { PixelButton } from "@/components/dashboard/pixel-button";
import { PixelCard } from "@/components/dashboard/pixel-card";
import { PixelBadge } from "@/components/dashboard/pixel-badge";
import { Textarea } from "@/components/ui/textarea";

type PendingRelease = {
  _id: string;
  externalId: string;
  template: string;
  aiContent?: string;
  sourceMetadata?: string;
  created_at: string;
};

type AiSlide = {
  objects: Array<{ id: string; text?: string; image_url?: string }>;
};

function parseAiContent(json?: string): AiSlide[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return parsed.slides ?? [];
  } catch {
    return [];
  }
}

function parseSourceMeta(json?: string): { repoFullName?: string; releaseTag?: string } {
  if (!json) return {};
  try {
    return JSON.parse(json);
  } catch {
    return {};
  }
}

function PendingCard({ release, onAction }: { release: PendingRelease; onAction: () => void }) {
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const slides = parseAiContent(release.aiContent);
  const meta = parseSourceMeta(release.sourceMetadata);
  const [editedContent, setEditedContent] = useState(() => {
    try {
      return JSON.stringify(JSON.parse(release.aiContent ?? ""), null, 2);
    } catch {
      return release.aiContent ?? "";
    }
  });

  async function handleApprove() {
    if (editing) {
      try {
        JSON.parse(editedContent);
      } catch {
        alert("Invalid JSON — please fix the syntax before saving.");
        return;
      }
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/github/releases/${release.externalId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing ? { aiContent: JSON.stringify(JSON.parse(editedContent)) } : {}),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Failed to approve release");
        return;
      }
      onAction();
    } finally {
      setLoading(false);
    }
  }

  async function handleDismiss() {
    setLoading(true);
    try {
      const res = await fetch(`/api/github/releases/${release.externalId}/approve`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Failed to dismiss release");
        return;
      }
      onAction();
    } finally {
      setLoading(false);
    }
  }

  return (
    <PixelCard>
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {meta.repoFullName && (
              <span className="font-mono text-xs text-brand/60">{meta.repoFullName}</span>
            )}
            {meta.releaseTag && (
              <PixelBadge label={meta.releaseTag} variant="pending" />
            )}
          </div>
          <span className="text-[10px] text-brand/40">
            {new Date(release.created_at).toLocaleDateString()}
          </span>
        </div>

        {/* AI-suggested content preview */}
        {!editing && slides.length > 0 && (
          <div className="border border-brand/10 bg-brand/5 p-3 space-y-2">
            <p className="text-[10px] text-brand/40 uppercase tracking-wide">AI Suggestion — {slides.length} slide{slides.length > 1 ? "s" : ""}</p>
            {slides.map((slide, i) => (
              <div key={i} className="text-xs text-brand space-y-1">
                {slides.length > 1 && (
                  <span className="text-[10px] text-brand/40">Slide {i + 1}</span>
                )}
                {slide.objects.map((obj, j) => (
                  <p key={j}>
                    <span className="text-brand/40">{obj.id}:</span>{" "}
                    {obj.text ?? (obj.image_url ? `[image: ${obj.image_url.slice(0, 40)}...]` : "")}
                  </p>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Edit mode */}
        {editing && (
          <Textarea
            className="text-xs font-mono min-h-[120px]"
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
          />
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <PixelButton onClick={handleApprove} disabled={loading}>
            {loading ? "..." : editing ? "Save & Approve" : "Approve"}
          </PixelButton>
          <PixelButton variant="ghost" onClick={() => setEditing(!editing)} disabled={loading}>
            {editing ? "Cancel Edit" : "Edit"}
          </PixelButton>
          <PixelButton variant="danger" onClick={handleDismiss} disabled={loading}>
            Dismiss
          </PixelButton>
        </div>
      </div>
    </PixelCard>
  );
}

export function PendingReviews({
  releases,
  onRefresh,
}: {
  releases: PendingRelease[];
  onRefresh?: () => void;
}) {
  if (releases.length === 0) return null;

  function handleAction() {
    if (onRefresh) onRefresh();
    else window.location.reload();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="font-[family-name:var(--font-press-start)] text-sm text-brand">
          Pending Reviews
        </h2>
        <PixelBadge label={String(releases.length)} variant="pending_review" />
      </div>
      {releases.map((r) => (
        <PendingCard key={r._id} release={r} onAction={handleAction} />
      ))}
    </div>
  );
}
