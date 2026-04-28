"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import Masonry from "react-masonry-css";
import { useUserId } from "@/hooks/use-user-id";
import { PixelEmptyState } from "@/components/admin/pixel-empty-state";
import { PixelButton } from "@/components/admin/pixel-button";
import { derivePreviewTitle } from "@/lib/drafts/preview";
import type { DraftConfig, DraftObjectContent, DraftSource } from "@/lib/drafts/types";
import type { FormatKey } from "@/lib/templates/canvas-types";
import { FORMAT_DIMENSIONS } from "@/lib/templates/canvas-types";
import { DraftPreview } from "./draft-preview";
import { DraftPreviewBoundary } from "./draft-preview-boundary";
import { LazyMount } from "./lazy-mount";
import { ApproveDraftModal } from "./approve-draft-modal";
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

function isDraftEmpty(objectContent: Record<string, DraftObjectContent> | undefined): boolean {
  if (!objectContent) return true;
  const values = Object.values(objectContent);
  if (values.length === 0) return true;
  return values.every((c) => !c?.text && !c?.image_url && !c?.video_url);
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

type ApproveModalState = {
  draftId: string;
  title: string;
  description: string;
  draftFormats: Format[];
};

type Format =
  | "square"
  | "landscape"
  | "portrait"
  | "video-square"
  | "video-landscape"
  | "video-portrait";

const ALL_POSTING_FORMATS: Format[] = [
  "square",
  "landscape",
  "portrait",
  "video-square",
  "video-landscape",
  "video-portrait",
];

function isDraftFormat(f: string): f is Format {
  return (ALL_POSTING_FORMATS as string[]).includes(f);
}

export function DraftsClient() {
  const userId = useUserId();
  const router = useRouter();
  const drafts = useQuery(api.drafts.listByUser, { userId });
  const integrations = useQuery(api.integrationSecrets.listByUser, { userId });
  const routingRows = useQuery(api.routingDefaults.listByUser, { userId });
  const [deleting, setDeleting] = useState<Set<string>>(new Set());
  const [approveModal, setApproveModal] = useState<ApproveModalState | null>(null);

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

  async function handleDelete(id: string) {
    setDeleting((prev) => new Set(prev).add(id));
    try {
      const res = await fetch(`/api/v1/drafts/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 404) {
        throw new Error(`Delete failed: ${res.status}`);
      }
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

  function handleOpenApprove(row: Row) {
    const config = parseConfig(row.config);
    // Derive title + description from draft config (use name or first text content)
    const title = row.name ?? (Object.values(config.objectContent ?? {}).find(c => c?.text)?.text ?? "Untitled draft").slice(0, 80);
    const description = Object.values(config.objectContent ?? {}).slice(1).find(c => c?.text)?.text?.slice(0, 220) ?? "";
    const draftFormats = (config.formats ?? ["landscape"]).filter(isDraftFormat);
    setApproveModal({
      draftId: row.id,
      title,
      description,
      draftFormats: draftFormats.length > 0 ? draftFormats : ["landscape"],
    });
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
              onDelete={() => handleDelete(row.id)}
              onApprove={() => handleOpenApprove(row as Row)}
            />
          ))}
        </Masonry>
      )}

      {approveModal && (
        <ApproveDraftModal
          draftId={approveModal.draftId}
          userId={userId}
          initialTitle={approveModal.title}
          initialDescription={approveModal.description}
          draftFormats={approveModal.draftFormats}
          routingRows={routingRows ?? []}
          integrations={integrations ?? []}
          onClose={() => setApproveModal(null)}
        />
      )}
    </div>
  );
}

function DraftCard({
  row,
  userId,
  busy,
  onDelete,
  onApprove,
}: {
  row: Row;
  userId: string;
  busy: boolean;
  onDelete: () => void;
  onApprove: () => void;
}) {
  const router = useRouter();
  const config = useMemo(() => parseConfig(row.config), [row.config]);
  const title = derivePreviewTitle(config, row.name);
  const empty = isDraftEmpty(config.objectContent);
  const fmt = primaryFormat(config);
  const dims = FORMAT_DIMENSIONS[fmt];
  const aspectStyle: React.CSSProperties = {
    aspectRatio: `${dims.width} / ${dims.height}`,
  };

  function open() {
    router.push(`/admin/kitchen?draft=${encodeURIComponent(row.id)}`);
  }

  const badgeRow = (
    <div className="flex items-center gap-2 mb-3 px-10 flex-wrap">
      {row.sourceSystem ? (
        <SourceSystemBadge
          system={row.sourceSystem}
          milestoneKey={row.milestoneKey ?? undefined}
        />
      ) : null}
      <OutputBadge output={config.output} />
      {empty ? <EmptyBadge /> : null}
    </div>
  );

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
      {/* Approve button — top-left corner, NES pixel style */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onApprove();
        }}
        className="absolute top-2 left-2 h-7 px-2 border-2 border-brand bg-gold hover:bg-gold/70 shadow-[2px_2px_0_var(--color-brand)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] transition-all font-[family-name:var(--font-press-start)] text-[8px] text-brand leading-none"
        aria-label="Approve draft"
        disabled={busy}
      >
        OK
      </button>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <button
            type="button"
            onClick={(e) => e.stopPropagation()}
            className="absolute top-2 right-2 h-7 w-7 border-2 border-brand bg-white hover:bg-red-100 shadow-[2px_2px_0_var(--color-brand)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] transition-all font-[family-name:var(--font-press-start)] text-[10px] text-brand leading-none"
            aria-label="Delete draft"
            disabled={busy}
          >
            X
          </button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete draft</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{title}&rdquo;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <PixelButton variant="ghost" onClick={(e) => e.stopPropagation()}>Cancel</PixelButton>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <PixelButton
                variant="danger"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
              >
                Delete
              </PixelButton>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {badgeRow}

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

      <PushStatusPanel draftId={row.id} userId={userId} />

      {titleBlock}
      {metaRow}
    </div>
  );
}

function SourceSystemBadge({
  system,
  milestoneKey,
}: {
  system: SourceSystem;
  milestoneKey?: string;
}) {
  const label = {
    github: "GitHub",
    stripe: "Stripe",
    posthog: "PostHog",
    ga4: "GA4",
  }[system];
  return (
    <span
      className="font-[family-name:var(--font-press-start)] text-[10px] px-2 py-1 border-2 border-brand uppercase tracking-wider bg-surface text-brand"
      title={milestoneKey ?? undefined}
    >
      {label}
    </span>
  );
}

function OutputBadge({ output }: { output: "image" | "video" }) {
  return (
    <span
      className={`
        font-[family-name:var(--font-press-start)] text-[10px] px-2 py-1
        border-2 border-brand uppercase tracking-wider
        ${output === "video" ? "bg-brand text-gold" : "bg-surface text-brand"}
      `}
    >
      {output}
    </span>
  );
}

function EmptyBadge() {
  return (
    <span
      className="font-[family-name:var(--font-press-start)] text-[10px] px-2 py-1 border-2 border-brand uppercase tracking-wider bg-surface text-brand"
      title="This draft has no content yet — preview shows template placeholder text."
    >
      Empty
    </span>
  );
}
