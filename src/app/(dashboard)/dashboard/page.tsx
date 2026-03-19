import { fetchQuery, fetchMutation } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { redirect } from "next/navigation";
import { PixelCard } from "@/components/dashboard/pixel-card";
import { PixelTable } from "@/components/dashboard/pixel-table";
import { PixelBadge } from "@/components/dashboard/pixel-badge";
import { PendingReviews } from "@/components/dashboard/pending-reviews";
import { PixelEmptyState } from "@/components/dashboard/pixel-empty-state";
import { PLANS } from "@/lib/plans";
import Link from "next/link";

function CreditMeter({
  remaining,
  total,
  plan,
}: {
  remaining: number;
  total: number;
  plan: string;
}) {
  const segments = 20;
  const filled = Math.round((Math.min(remaining, total) / total) * segments);
  const pct = total > 0 ? Math.round((remaining / total) * 100) : 0;

  return (
    <div className="border-2 border-brand bg-white p-5 shadow-[4px_4px_0_var(--color-brand)]">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="font-[family-name:var(--font-press-start)] text-xs text-brand">
            Credits
          </h2>
          <p className="text-xs text-brand/60 mt-0.5">{plan} plan</p>
        </div>
        <span className="font-[family-name:var(--font-press-start)] text-sm text-brand">
          {remaining} / {total}
        </span>
      </div>

      {/* Segmented pixel-art progress bar */}
      <div className="flex gap-[3px]">
        {Array.from({ length: segments }).map((_, i) => (
          <div
            key={i}
            className={`h-6 flex-1 border border-brand/10 ${
              i < filled ? "bg-gold" : "bg-brand/10"
            }`}
          />
        ))}
      </div>

      <p className="text-right text-[10px] text-brand/50 mt-1.5 font-[family-name:var(--font-press-start)]">
        {pct}% remaining
      </p>
    </div>
  );
}

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  // Ensure trial profile exists (grants 10 credits on first visit)
  await fetchMutation(api.userProfiles.create, { userId: user._id, email: user.email });

  const [stats, releases, pendingReleases, brands] = await Promise.all([
    fetchQuery(api.userProfiles.getStats, { userId: user._id }),
    fetchQuery(api.releases.listByUser, { userId: user._id }),
    fetchQuery(api.releases.listPendingByUser, { userId: user._id }),
    fetchQuery(api.brands.listByUser, { userId: user._id }),
  ]);

  const recent = releases.slice(0, 10);
  const plan = PLANS[stats.plan as keyof typeof PLANS];

  const statCards = [
    { label: "Used (Month)", value: stats.creditsUsedThisMonth },
    { label: "Releases", value: stats.totalReleases },
    { label: "Images", value: stats.totalImages },
  ];

  const hasBrands = brands.length > 0;
  const hasReleases = releases.length > 0;

  return (
    <div className="space-y-8">
      <h1 className="font-[family-name:var(--font-press-start)] text-lg text-brand">
        Dashboard
      </h1>

      {/* Credit meter — primary dashboard element */}
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
            description="Generate your first branded images via the API or connect GitHub."
            cta={{ label: "Read the Docs", href: "/docs" }}
            secondaryCta={{ label: "Connect GitHub", href: "/dashboard/account" }}
          />
        ) : (
          <PixelTable headers={["ID", "Template", "Status", "Credits", "Date"]}>
            {recent.map((r) => (
              <tr key={r._id} className="hover:bg-gold/5">
                <td className="px-4 py-3 font-mono text-xs">
                  <Link
                    href={`/dashboard/history?id=${r.externalId}`}
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
