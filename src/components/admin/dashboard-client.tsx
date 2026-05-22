"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useUserId } from "@/hooks/use-user-id";
// Stub — dashboard reworked in plan 08-05, plan-tiers deleted in 08-04
type Plan = string;
function resolvePostAllowance(input: { plan: Plan }) {
  const names: Record<string, string> = { trial: "On the House", free: "Free", plate: "Full Plate" };
  return { name: names[input.plan] ?? input.plan, remaining: 0, total: 0 };
}
import { CreditMeter } from "@/components/admin/credit-meter";
import { PixelCard } from "@/components/admin/pixel-card";
import { PixelTable } from "@/components/admin/pixel-table";
import { PixelBadge } from "@/components/admin/pixel-badge";
import { PixelEmptyState } from "@/components/admin/pixel-empty-state";
import Link from "next/link";

export function DashboardClient() {
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

  const allowance = resolvePostAllowance({
    plan: stats.plan as Plan,
  });

  const recent = releases.slice(0, 10);
  const statCards = [
    { label: "Releases", value: stats.totalReleases },
    { label: "Images", value: stats.totalImages },
    { label: "Videos", value: stats.totalVideos ?? 0 },
  ];

  return (
    <div className="space-y-8">
      <h1 className="font-[family-name:var(--font-press-start)] text-lg text-brand">
        Dashboard
      </h1>

      <CreditMeter
        remaining={allowance.remaining}
        total={allowance.total}
        plan={allowance.name}
      />

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
            title="No releases yet"
            description="Generate your first branded images via the API or MCP."
            cta={{ label: "Read the Docs", href: "/docs" }}
            secondaryCta={{ label: "Set up the MCP", href: "/docs#mcp" }}
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
