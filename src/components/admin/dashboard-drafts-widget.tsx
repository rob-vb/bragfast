"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useUserId } from "@/hooks/use-user-id";
import { PixelCard } from "@/components/admin/pixel-card";
import { PixelEmptyState } from "@/components/admin/pixel-empty-state";

const PREVIEW_COUNT = 3;

export function DashboardDraftsWidget() {
  const userId = useUserId();
  const drafts = useQuery(api.drafts.listByUser, { userId });

  if (drafts === undefined) {
    return (
      <div>
        <h2 className="mb-4 font-[family-name:var(--font-press-start)] text-sm text-brand">
          Pending drafts
        </h2>
        <div className="h-32 border-2 border-dashed border-brand/30 bg-surface animate-pixel-skeleton" />
      </div>
    );
  }

  const pending = drafts.filter((d) => !d.suppressed).slice(0, PREVIEW_COUNT);
  const totalPending = drafts.filter((d) => !d.suppressed).length;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-[family-name:var(--font-press-start)] text-sm text-brand">
          Pending drafts
          {totalPending > PREVIEW_COUNT ? (
            <span className="ml-2 text-xs text-brand/60">
              ({PREVIEW_COUNT} of {totalPending})
            </span>
          ) : null}
        </h2>
        <Link
          href="/admin/drafts"
          className="text-xs underline underline-offset-4 hover:text-gold"
        >
          View all →
        </Link>
      </div>
      {pending.length === 0 ? (
        <PixelEmptyState
          title="No drafts waiting"
          description="Sous-Chef will queue posts here when your sources fire milestones."
          noPrimary
          cta={{ label: "", href: "#" }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {pending.map((d) => (
            <Link key={d.id} href={`/admin/drafts#${d.id}`} className="block">
              <PixelCard className="hover:border-gold transition-colors">
                <p className="font-[family-name:var(--font-press-start)] text-[10px] text-brand/60 uppercase">
                  {d.sourceSystem ?? d.source}
                </p>
                <p className="mt-2 line-clamp-2 text-sm text-brand">
                  {d.name ?? "Untitled draft"}
                </p>
                <p className="mt-2 text-xs text-brand/50">
                  {new Date(d.created_at).toLocaleDateString()}
                </p>
              </PixelCard>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
