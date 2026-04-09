"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useUserId } from "@/hooks/use-user-id";
import { PLANS } from "@/lib/plans";
import type { PlanId } from "@/lib/plans";
import { CreditMeter } from "@/components/admin/credit-meter";
import { PixelCard } from "@/components/admin/pixel-card";
import { PixelTable } from "@/components/admin/pixel-table";
import { PixelBadge } from "@/components/admin/pixel-badge";
import { PendingReviews } from "@/components/admin/pending-reviews";
import { PixelEmptyState } from "@/components/admin/pixel-empty-state";
import Link from "next/link";

export function DashboardClient() {
  const userId = useUserId();

  const stats = useQuery(api.userProfiles.getStats, { userId });
  const releases = useQuery(api.releases.listByUser, { userId });
  const pendingReleases = useQuery(api.releases.listPendingByUser, { userId });

  // Loading state — show nothing while subscriptions hydrate
  if (!stats || !releases || !pendingReleases) {
    return (
      <div className="space-y-8">
        <h1 className="font-[family-name:var(--font-press-start)] text-lg text-brand">
          Dashboard
        </h1>
        <div className="h-32 border-2 border-dashed border-brand/30 bg-surface animate-pixel-skeleton" />
      </div>
    );
  }

  const plan = PLANS[stats.plan as PlanId];
  const recent = releases.slice(0, 10);

  const statCards = [
    { label: "Used (Month)", value: stats.creditsUsedThisMonth },
    { label: "Releases", value: stats.totalReleases },
    { label: "Images", value: stats.totalImages },
  ];

  return (
    <div className="space-y-8">
      <h1 className="font-[family-name:var(--font-press-start)] text-lg text-brand">
        Dashboard
      </h1>

      {/* Credit meter — primary admin element */}
      <CreditMeter
        remaining={stats.creditsRemaining}
        total={plan.credits}
        plan={plan.name}
      />

      {/* Secondary stats */}
      <div className="grid grid-cols-3 gap-4">
        {statCards.map((s) => (
          <PixelCard key={s.label}>
            <p className="font-[family-name:var(--font-press-start)] text-2xl text-brand">
              {s.value}
            </p>
            <p className="mt-1 text-xs text-brand/60">{s.label}</p>
          </PixelCard>
        ))}
      </div>

      {/* Pending Reviews */}
      {pendingReleases.length > 0 && (
        <PendingReviews releases={pendingReleases} />
      )}

      {/* Recent releases */}
      <div>
        <h2 className="mb-4 font-[family-name:var(--font-press-start)] text-sm text-brand">
          Recent Releases
        </h2>
        {recent.length === 0 ? (
          <PixelEmptyState
            title="Time to cook!"
            description="Generate your first branded images via the API or MCP."
            cta={{ label: "Read the Docs", href: "/docs" }}
            secondaryCta={{ label: "Set up the MCP", href: "/docs#mcp" }}
            extraCtas={[{ label: "Cook", href: "/admin/kitchen?tab=cook" }]}
            noPrimary
          />
        ) : (
          <PixelTable headers={["ID", "Template", "Status", "Credits", "Date"]}>
            {recent.map((r) => (
              <tr key={r._id} className="hover:bg-gold/5">
                <td className="px-4 py-3 font-mono text-xs">
                  <Link
                    href={`/admin/history?id=${r.externalId}`}
                    className="underline underline-offset-4 hover:text-gold"
                  >
                    {r.externalId.slice(0, 14)}...
                  </Link>
                </td>
                <td className="px-4 py-3 text-xs">{r.template}</td>
                <td className="px-4 py-3">
                  <PixelBadge status={r.status} />
                </td>
                <td className="px-4 py-3 text-xs">{r.credits_used}</td>
                <td className="px-4 py-3 text-xs">
                  {new Date(r.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </PixelTable>
        )}
      </div>
    </div>
  );
}
