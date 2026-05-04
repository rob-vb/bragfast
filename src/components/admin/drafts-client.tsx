"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import posthog from "posthog-js";
import Masonry from "react-masonry-css";
import { Textarea } from "@/components/ui/textarea";
import { useUserId } from "@/hooks/use-user-id";
import { PixelEmptyState } from "@/components/admin/pixel-empty-state";
import { PixelButton } from "@/components/admin/pixel-button";
import { derivePreviewTitle } from "@/lib/drafts/preview";
import type { DraftConfig, DraftSource } from "@/lib/drafts/types";
import type { FormatKey } from "@/lib/templates/canvas-types";
import { FORMAT_DIMENSIONS } from "@/lib/templates/canvas-types";
import { DraftPreview } from "./draft-preview";
import { DraftPreviewBoundary } from "./draft-preview-boundary";
import { LazyMount } from "./lazy-mount";
import { PushStatusPanel } from "./push-status-panel";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type SourceSystem = "github" | "stripe" | "posthog" | "ga4";

type Row = {
  id: string;
  name: string | null;
  source: DraftSource;
  sourceSystem?: SourceSystem | null;
  milestoneKey?: string | null;
  config: string;
  confidence?: number | null;
  suppressed?: boolean;
  created_at: string;
};

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffMs = now - then;
  const diffMin = Math.round(diffMs / 60_000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  const diffMonth = Math.round(diffDay / 30);
  return `${diffMonth}mo ago`;
}

function parseConfig(raw: string): DraftConfig {
  try {
    return JSON.parse(raw) as DraftConfig;
  } catch {
    return { output: "image" };
  }
}

const VALID_FORMATS: FormatKey[] = ["landscape", "square", "portrait"];

function primaryFormat(config: DraftConfig): FormatKey {
  const formats = config.formats ?? [];
  if (formats.includes("landscape")) return "landscape";
  const first = formats.find((f): f is FormatKey =>
    VALID_FORMATS.includes(f as FormatKey),
  );
  return first ?? "landscape";
}

export function DraftsClient() {
  const userId = useUserId();
  const router = useRouter();
  const drafts = useQuery(api.drafts.listByUser, { userId });
  const markSeen = useMutation(api.drafts.markSeen);
  const [deleting, setDeleting] = useState<Set<string>>(new Set());

  // Stamp last-visit time so the sidebar "new drafts" badge clears.
  // Re-fires when drafts arrive while the page is open.
  useEffect(() => {
    if (!userId || drafts === undefined) return;
    void markSeen({});
  }, [userId, drafts?.length, markSeen]);

  if (!drafts) {
    return (
      <div className="space-y-6">
        <h1 className="font-[family-name:var(--font-press-start)] text-lg text-brand">
          Drafts
        </h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-40 border-2 border-dashed border-brand/30 bg-surface animate-pixel-skeleton"
            />
          ))}
        </div>
      </div>
    );
  }

  async function handleDelete(id: string, reason?: string) {
    setDeleting((prev) => new Set(prev).add(id));
    try {
      const url = reason
        ? `/api/v1/drafts/${id}?reason=${encodeURIComponent(reason)}`
        : `/api/v1/drafts/${id}`;
      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok && res.status !== 404) {
        throw new Error(`Delete failed: ${res.status}`);
      }
      // S6.3: surface user-skip reason capture in analytics.
      posthog.capture("draft_skipped", {
        trigger_type: "pr_merged",
        skip_reason: reason && reason.trim() ? reason : null,
        confidence_score: null,
        time_from_draft_seconds: null,
      });
      router.refresh();
    } catch (err) {
      console.error("Delete draft failed", err);
    } finally {
      setDeleting((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="font-[family-name:var(--font-press-start)] text-lg text-brand">
          Drafts
        </h1>
        {drafts.length > 0 && (
          <span className="font-[family-name:var(--font-geist-sans)] text-sm text-brand/60">
            {drafts.length} {drafts.length === 1 ? "draft" : "drafts"} ready to cook
          </span>
        )}
      </div>

      {drafts.length === 0 ? (
        <PixelEmptyState
          title="No drafts yet"
          description="Your Sous-Chef (agent) can create drafts for you. You can also save a draft from the Kitchen."
          cta={{ label: "Go to Kitchen", href: "/admin/kitchen" }}
          secondaryCta={{ label: "Check your sous-chef", href: "/admin/sous-chef" }}
        />
      ) : (
        <Masonry
          breakpointCols={{ default: 3, 1280: 2, 768: 1 }}
          className="flex -ml-4 w-auto"
          columnClassName="pl-4 space-y-4 bg-clip-padding"
        >
          {drafts.map((row) => (
            <DraftCard
              key={row.id}
              row={row as Row}
              userId={userId}
              busy={deleting.has(row.id)}
              onDelete={(reason) => handleDelete(row.id, reason)}
            />
          ))}
        </Masonry>
      )}
    </div>
  );
}

function DraftCard({
  row,
  userId,
  busy,
  onDelete,
}: {
  row: Row;
  userId: string;
  busy: boolean;
  onDelete: (reason?: string) => void;
}) {
  const router = useRouter();
  const config = useMemo(() => parseConfig(row.config), [row.config]);
  const isAgent = row.source === "agent";
  const [skipReason, setSkipReason] = useState("");
  const title = derivePreviewTitle(config, row.name);
  const fmt = primaryFormat(config);
  const dims = FORMAT_DIMENSIONS[fmt];
  const aspectStyle: React.CSSProperties = {
    aspectRatio: `${dims.width} / ${dims.height}`,
  };

  function open() {
    router.push(`/admin/kitchen?draft=${encodeURIComponent(row.id)}`);
  }

  const titleBlock = (
    <h3 className="font-[family-name:var(--font-press-start)] text-xs text-brand leading-relaxed line-clamp-2 mb-3">
      {title}
    </h3>
  );

  const metaRow = (
    <div className="flex items-center justify-between gap-2 font-[family-name:var(--font-geist-sans)] text-xs text-brand/60">
      {config.templateId ? (
        <span
          className="font-[family-name:var(--font-geist-mono)] text-[11px] px-2 py-0.5 bg-surface border border-brand/30 truncate"
          title={config.templateId}
        >
          {config.templateId}
        </span>
      ) : (
        <span className="italic text-brand/40">no template</span>
      )}
      <span className="shrink-0">{formatRelative(row.created_at)}</span>
    </div>
  );

  // Boundary fallback = pre-badge card body (badges rendered outside the boundary).
  const boundaryFallback = (
    <>
      {titleBlock}
      {metaRow}
    </>
  );

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={open}
      onKeyDown={(e) => {
        // The card is role="button", so Enter/Space activates it — but the
        // delete-confirmation dialog renders inside the card and its textarea
        // bubbles every keypress here. Only activate when the card itself is
        // focused, not a nested input/textarea/button.
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open();
        }
      }}
      className={`
        relative border-2 border-brand bg-white p-4
        shadow-[4px_4px_0_var(--color-brand)]
        hover:shadow-[2px_2px_0_var(--color-brand)]
        transition-shadow cursor-pointer
        focus:outline-2 focus:outline-offset-2 focus:outline-gold
        ${busy ? "opacity-50 pointer-events-none" : ""}
      `}
      aria-label={`Open draft: ${title}`}
    >
      <div className="mb-3">
        <DraftPreviewBoundary key={row.id} fallback={boundaryFallback}>
          <LazyMount
            rootMargin="200px"
            placeholder={
              <div
                className="border-2 border-dashed border-brand/30 bg-surface animate-pixel-skeleton"
                style={aspectStyle}
              />
            }
          >
            <DraftPreview config={config} />
          </LazyMount>
        </DraftPreviewBoundary>
      </div>

      <PushStatusPanel draftId={row.id} />

      {titleBlock}
      {metaRow}

      <div className="mt-3 flex gap-2">
        <PixelButton
          onClick={(e) => {
            e.stopPropagation();
            open();
          }}
          disabled={busy}
        >
          Edit
        </PixelButton>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <PixelButton
              variant="danger"
              onClick={(e) => e.stopPropagation()}
              disabled={busy}
            >
              Delete
            </PixelButton>
          </AlertDialogTrigger>
          <AlertDialogContent onClick={(e) => e.stopPropagation()}>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete draft</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete &ldquo;{title}&rdquo;? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            {isAgent ? (
              <div className="space-y-2">
                <label
                  htmlFor={`skip-reason-${row.id}`}
                  className="block font-[family-name:var(--font-press-start)] text-[10px] text-brand/70 uppercase tracking-wider"
                >
                  Reason (optional)
                </label>
                <Textarea
                  id={`skip-reason-${row.id}`}
                  value={skipReason}
                  onChange={(e) => setSkipReason(e.target.value)}
                  placeholder="e.g. off-brand, too soon, already shared"
                  maxLength={200}
                  className="text-sm"
                />
              </div>
            ) : null}
            <AlertDialogFooter>
              <AlertDialogCancel asChild>
                <PixelButton variant="ghost" onClick={(e) => e.stopPropagation()}>Cancel</PixelButton>
              </AlertDialogCancel>
              <AlertDialogAction asChild>
                <PixelButton
                  variant="danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(skipReason.trim() || undefined);
                  }}
                >
                  Delete
                </PixelButton>
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

