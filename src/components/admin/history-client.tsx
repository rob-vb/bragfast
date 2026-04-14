"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useUserId } from "@/hooks/use-user-id";
import { useSearchParams } from "next/navigation";
import { HistoryFilter } from "@/components/admin/history-filter";
import { PixelEmptyState } from "@/components/admin/pixel-empty-state";
import { HistoryTable } from "@/components/admin/history-table";

export function HistoryClient() {
  const userId = useUserId();
  const searchParams = useSearchParams();
  const status = searchParams.get("status") ?? "all";
  const highlightId = searchParams.get("id") ?? undefined;

  const allReleases = useQuery(api.releases.listByUser, { userId });

  if (!allReleases) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-[family-name:var(--font-press-start)] text-lg text-brand">
            History
          </h1>
        </div>
        <div className="h-32 border-2 border-dashed border-brand/30 bg-surface animate-pixel-skeleton" />
      </div>
    );
  }

  const releases = status !== "all"
    ? allReleases.filter((r) => r.status === status)
    : allReleases;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-[family-name:var(--font-press-start)] text-lg text-brand">
          History
        </h1>
        <HistoryFilter current={status} />
      </div>

      {releases.length === 0 ? (
        <PixelEmptyState
          title="No releases yet"
          description="Your release history will appear here once you generate your first images."
          cta={{ label: "Get Started", href: "/docs" }}
        />
      ) : (
        <HistoryTable releases={releases} highlightId={highlightId} />
      )}
    </div>
  );
}
