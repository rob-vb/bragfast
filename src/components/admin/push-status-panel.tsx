"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { toast } from "sonner";
import { PixelButton } from "./pixel-button";

// ── Types ─────────────────────────────────────────────────────────────────────

type PushState = "pending" | "in_flight" | "queued" | "drafted" | "failed";

type PushRow = {
  _id: string;
  format: string;
  provider: "buffer" | "postiz";
  channelId: string;
  channelLabel?: string;
  state: PushState;
  postState: "queue" | "draft";
  providerPostId?: string;
  errorClass?: string;
  errorMessage?: string;
  attempts: number;
  lastAttemptAt?: number;
  created_at: string;
  updated_at: string;
};

interface Props {
  draftId: string;
  userId: string;
}

// ── Format label map ──────────────────────────────────────────────────────────

const FORMAT_LABELS: Record<string, string> = {
  square: "Square",
  landscape: "Landscape",
  portrait: "Portrait",
  "video-square": "Video · Square",
  "video-landscape": "Video · Landscape",
  "video-portrait": "Video · Portrait",
};

function formatLabel(key: string): string {
  return FORMAT_LABELS[key] ?? key;
}

// ── Channel label derivation ──────────────────────────────────────────────────

/**
 * Returns the display label for a push row's channel.
 * Uses the denormalized `channelLabel` if set; falls back to "provider:channelId".
 */
function channelDisplay(row: PushRow): string {
  if (row.channelLabel) {
    const providerPrefix = row.provider === "buffer" ? "Buffer" : "Postiz";
    return `${providerPrefix} · ${row.channelLabel}`;
  }
  return `${row.provider}:${row.channelId}`;
}

// ── Relative time formatter ───────────────────────────────────────────────────

function formatRelativeMs(ms: number): string {
  const now = Date.now();
  const diffMs = now - ms;
  const diffMin = Math.round(diffMs / 60_000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  return `${Math.round(diffDay / 30)}mo ago`;
}

function pushedAtDisplay(row: PushRow): string {
  if (row.lastAttemptAt) return formatRelativeMs(row.lastAttemptAt);
  return "Pending";
}

// ── Status badge ──────────────────────────────────────────────────────────────

interface BadgeProps {
  state: PushState;
}

function StatusBadge({ state }: BadgeProps) {
  const baseClass =
    "font-[family-name:var(--font-press-start)] text-[10px] px-2 py-1 border-2 border-brand uppercase tracking-wider";

  if (state === "pending" || state === "in_flight") {
    return (
      <span className={`${baseClass} bg-surface text-brand/60`}>
        Pushing...
      </span>
    );
  }

  if (state === "queued") {
    return (
      <span className={`${baseClass} bg-gold text-brand`}>
        Queued
      </span>
    );
  }

  if (state === "drafted") {
    return (
      <span className={`${baseClass} bg-gold/60 text-brand`}>
        Drafted
      </span>
    );
  }

  // failed
  return (
    <span className={`${baseClass} bg-red-100 text-red-700 border-red-500`}>
      Failed
    </span>
  );
}

// ── Retry button ──────────────────────────────────────────────────────────────

function RetryButton({
  rowId,
  userId,
}: {
  rowId: string;
  userId: string;
}) {
  const retryMutation = useMutation(api.draftPushes.retryPush);

  async function handleRetry(e: React.MouseEvent) {
    e.stopPropagation();
    try {
      // rowId is a Convex document ID — cast is safe here since it comes
      // directly from a listByDraft query result.
      const result = await retryMutation({
        rowId: rowId as Parameters<typeof retryMutation>[0]["rowId"],
        userId,
      });
      if (result.ok) {
        toast.success("Retry queued", {
          description: "The push will be retried shortly.",
        });
      } else {
        toast.error("Retry failed", {
          description: `Could not retry: ${result.error}`,
        });
      }
    } catch (err) {
      toast.error("Retry failed", {
        description:
          err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return (
    <PixelButton
      variant="ghost"
      className="text-[9px] px-2 py-1 border border-brand"
      onClick={handleRetry}
      aria-label="Retry push"
    >
      Retry
    </PixelButton>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

/**
 * PushStatusPanel — live-updating table of draftPushes rows for a given draft.
 *
 * Renders null when there are no push rows (draft was never approved or the
 * query is still loading). Mount this below the draft preview area.
 *
 * Live updates are provided by Convex's `useQuery` reactive subscription —
 * no manual polling required.
 */
export function PushStatusPanel({ draftId, userId }: Props) {
  const rows = useQuery(api.draftPushes.listByDraft, { draftId, userId });

  // Render nothing while loading or when no push rows exist.
  if (rows === undefined || rows.length === 0) return null;

  return (
    <div
      className="mt-3 border-2 border-brand bg-white shadow-[4px_4px_0_var(--color-brand)]"
      onClick={(e) => e.stopPropagation()}
      // Prevent the card's open() click handler from firing when interacting with the panel.
    >
      {/* Panel header */}
      <div className="px-3 py-2 border-b-2 border-brand bg-gold/20">
        <span className="font-[family-name:var(--font-press-start)] text-[9px] text-brand uppercase tracking-wider">
          Push Status
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-brand/20">
              <th className="px-3 py-2 font-[family-name:var(--font-press-start)] text-[8px] text-brand uppercase whitespace-nowrap">
                Format
              </th>
              <th className="px-3 py-2 font-[family-name:var(--font-press-start)] text-[8px] text-brand uppercase whitespace-nowrap">
                Channel
              </th>
              <th className="px-3 py-2 font-[family-name:var(--font-press-start)] text-[8px] text-brand uppercase whitespace-nowrap">
                Status
              </th>
              <th className="px-3 py-2 font-[family-name:var(--font-press-start)] text-[8px] text-brand uppercase whitespace-nowrap">
                Pushed
              </th>
              <th className="px-3 py-2 font-[family-name:var(--font-press-start)] text-[8px] text-brand uppercase whitespace-nowrap">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand/10">
            {(rows as PushRow[]).map((row) => (
              <tr key={row._id} className="hover:bg-gold/5 transition-colors">
                {/* Format */}
                <td className="px-3 py-2 font-[family-name:var(--font-geist-sans)] text-xs text-brand whitespace-nowrap">
                  {formatLabel(row.format)}
                </td>

                {/* Channel */}
                <td className="px-3 py-2 font-[family-name:var(--font-geist-sans)] text-xs text-brand whitespace-nowrap">
                  {channelDisplay(row)}
                </td>

                {/* Status + error details + provider post ID */}
                <td className="px-3 py-2">
                  <div className="space-y-1">
                    <StatusBadge state={row.state} />
                    {row.state === "failed" && row.errorMessage && (
                      <p className="font-[family-name:var(--font-geist-mono)] text-[10px] text-red-600 break-all max-w-[200px]">
                        {row.errorMessage}
                      </p>
                    )}
                    {row.providerPostId && (
                      <span className="font-[family-name:var(--font-geist-mono)] text-[10px] text-brand/50 px-1.5 py-0.5 bg-surface border border-brand/20 inline-block truncate max-w-[160px]" title={row.providerPostId}>
                        {row.providerPostId}
                      </span>
                    )}
                  </div>
                </td>

                {/* Pushed At */}
                <td className="px-3 py-2 font-[family-name:var(--font-geist-sans)] text-xs text-brand/60 whitespace-nowrap">
                  {pushedAtDisplay(row)}
                </td>

                {/* Action */}
                <td className="px-3 py-2">
                  {row.state === "failed" && (
                    <RetryButton rowId={row._id} userId={userId} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
