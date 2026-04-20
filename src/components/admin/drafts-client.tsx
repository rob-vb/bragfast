"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useUserId } from "@/hooks/use-user-id";
import { PixelEmptyState } from "@/components/admin/pixel-empty-state";
import { PixelButton } from "@/components/admin/pixel-button";
import { derivePreviewTitle } from "@/lib/drafts/preview";
import type { DraftConfig, DraftSource } from "@/lib/drafts/types";
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

type Row = {
  id: string;
  name: string | null;
  source: DraftSource;
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

export function DraftsClient() {
  const userId = useUserId();
  const router = useRouter();
  const drafts = useQuery(api.drafts.listByUser, { userId });
  const [deleting, setDeleting] = useState<Set<string>>(new Set());

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
          description="Agents can POST to /api/v1/drafts to queue up releases for you. You can also save a draft from the Kitchen."
          cta={{ label: "Go to Kitchen", href: "/admin/kitchen" }}
          secondaryCta={{ label: "Read API Docs", href: "/docs" }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {drafts.map((row) => (
            <DraftCard
              key={row.id}
              row={row as Row}
              busy={deleting.has(row.id)}
              onDelete={() => handleDelete(row.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DraftCard({
  row,
  busy,
  onDelete,
}: {
  row: Row;
  busy: boolean;
  onDelete: () => void;
}) {
  const router = useRouter();
  const config = parseConfig(row.config);
  const title = derivePreviewTitle(config, row.name);

  function open() {
    router.push(`/admin/kitchen?draft=${encodeURIComponent(row.id)}`);
  }

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
        hover:translate-x-[2px] hover:translate-y-[2px]
        transition-all cursor-pointer
        focus:outline-2 focus:outline-offset-2 focus:outline-gold
        ${busy ? "opacity-50 pointer-events-none" : ""}
      `}
      aria-label={`Open draft: ${title}`}
    >
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

      <div className="flex items-center gap-2 mb-3 pr-10">
        <SourceBadge source={row.source} />
        <OutputBadge output={config.output} />
      </div>

      <h3 className="font-[family-name:var(--font-press-start)] text-xs text-brand leading-relaxed line-clamp-2 mb-3">
        {title}
      </h3>

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
    </div>
  );
}

function SourceBadge({ source }: { source: DraftSource }) {
  const isAgent = source === "agent";
  return (
    <span
      className={`
        font-[family-name:var(--font-press-start)] text-[10px] px-2 py-1
        border-2 border-brand uppercase tracking-wider
        ${isAgent ? "bg-gold text-brand" : "bg-white text-brand"}
      `}
    >
      {isAgent ? "Agent" : "You"}
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
