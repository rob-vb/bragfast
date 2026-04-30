"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useUserId } from "@/hooks/use-user-id";
import { PLANS } from "@/lib/plans";
import type { PlanId } from "@/lib/plans";
import { TIER_CONFIG, tierFor } from "@/lib/plan-tiers";
import { CreditMeter } from "@/components/admin/credit-meter";
import { PixelCard } from "@/components/admin/pixel-card";
import { PixelTable } from "@/components/admin/pixel-table";
import { PixelBadge } from "@/components/admin/pixel-badge";
import { PixelEmptyState } from "@/components/admin/pixel-empty-state";
import { RetroDraftHero } from "@/components/admin/retro-draft-hero";
import { GoalHeroCard } from "@/components/admin/goal-hero-card";
import { SousChefHistoryFeed } from "@/components/admin/sous-chef-history-feed";
import { DashboardSourcesWidget } from "@/components/admin/dashboard-sources-widget";
import { DashboardDraftsWidget } from "@/components/admin/dashboard-drafts-widget";
import { isLaunchModeRepositioned } from "@/lib/launch-mode";
import Link from "next/link";

export function DashboardClient({ showRetroHero = false }: { showRetroHero?: boolean }) {
  const userId = useUserId();

  const stats = useQuery(api.userProfiles.getStats, { userId });
  const releases = useQuery(api.releases.listByUser, { userId });

  // Loading state — show nothing while subscriptions hydrate
  if (!stats || !releases) {
    return (
      <div className="space-y-8">
        <h1 className="font-[family-name:var(--font-press-start)] text-lg text-brand">
          Dashboard
        </h1>
        <div className="h-32 border-2 border-dashed border-brand/30 bg-surface animate-pixel-skeleton" />
      </div>
    );
  }

  // S2.7: branch on accounting model — new tiers render posts meter, legacy renders credits.
  const tier = tierFor(stats.plan as never);
  const newTierMeter = tier
    ? {
        remaining:
          (tier === "free"
            ? stats.postsLifetime
            : stats.postsRemainingThisMonth) ?? 0,
        total: TIER_CONFIG[tier].posts,
        name:
          tier === "free"
            ? "On the House"
            : tier === "toast"
              ? "Toast"
              : tier === "plate"
                ? "Full Plate"
                : "Buffet",
      }
    : null;
  const plan = !newTierMeter ? PLANS[stats.plan as PlanId] : null;
  const repositioned = isLaunchModeRepositioned();

  // S6.1: launch-mode dashboard — Goal hero → History → Sources → Posts → Drafts.
  if (repositioned) {
    return (
      <div className="space-y-8">
        <h1 className="font-[family-name:var(--font-press-start)] text-lg text-brand">
          Dashboard
        </h1>

        {showRetroHero && <RetroDraftHero />}

        {/* 1. Goal hero (S5.2) */}
        <GoalHeroCard userId={userId} />

        {/* 2. History feed (S2.3, compact) */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-[family-name:var(--font-press-start)] text-sm text-brand">
              Recent activity
            </h2>
            <Link
              href="/admin/sous-chef/history"
              className="text-xs underline underline-offset-4 hover:text-gold"
            >
              Full history →
            </Link>
          </div>
          <SousChefHistoryFeed limit={10} />
        </div>

        {/* 3. Sources */}
        <DashboardSourcesWidget />

        {/* 4. Posts remaining (replaces credits meter on new tiers) */}
        {newTierMeter ? (
          <CreditMeter
            remaining={newTierMeter.remaining}
            total={newTierMeter.total}
            plan={newTierMeter.name}
          />
        ) : plan ? (
          <CreditMeter
            remaining={stats.creditsRemaining}
            total={plan.credits}
            plan={plan.name}
          />
        ) : null}

        {/* 5. Pending drafts queue */}
        <DashboardDraftsWidget />
      </div>
    );
  }

  // Legacy dashboard (pre-launch / off-mode).
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

      {showRetroHero && <RetroDraftHero />}

      {newTierMeter ? (
        <CreditMeter
          remaining={newTierMeter.remaining}
          total={newTierMeter.total}
          plan={newTierMeter.name}
        />
      ) : plan ? (
        <CreditMeter
          remaining={stats.creditsRemaining}
          total={plan.credits}
          plan={plan.name}
        />
      ) : null}

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
            extraCtas={[{ label: "Cook", href: "/admin/kitchen" }]}
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
