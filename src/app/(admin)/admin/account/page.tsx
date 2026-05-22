import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { redirect } from "next/navigation";
import { PixelCard } from "@/components/admin/pixel-card";
import { DeleteAccountDialog } from "@/components/admin/delete-account-dialog";
import { PLANS } from "@/lib/plans";
// Stub — account page reworked in plan 08-05, plan-tiers deleted in 08-04
type Plan = string;
function resolvePostAllowance(input: { plan: Plan; creditsRemaining: number }) {
  const names: Record<string, string> = { trial: "On the House", free: "Free", plate: "Full Plate" };
  return { name: names[input.plan] ?? input.plan, remaining: input.creditsRemaining, total: 0, unitLabel: "posts" as const };
}
import { ManageBillingButton } from "./manage-billing-button";
import Link from "next/link";

function CreditBar({ remaining, total }: { remaining: number; total: number }) {
  const blocks = 20;
  const filled = Math.min(blocks, Math.round((remaining / total) * blocks));

  return (
    <div className="flex gap-[3px]">
      {Array.from({ length: blocks }).map((_, i) => (
        <div
          key={i}
          className={`h-4 w-3 border border-brand/10 ${
            i < filled ? "bg-gold" : "bg-brand/10"
          }`}
        />
      ))}
    </div>
  );
}

export default async function AccountPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const stats = await fetchQuery(api.userProfiles.getStats, {
    userId: user._id,
  });

  const allowance = resolvePostAllowance({
    plan: stats.plan as Plan,
    creditsRemaining: stats.creditsRemaining,
  });
  const legacyPlan = PLANS[stats.plan as keyof typeof PLANS];
  const isFree = stats.plan === "trial" || stats.plan === "free";

  return (
    <div className="space-y-8">
      <h1 className="font-[family-name:var(--font-press-start)] text-lg text-brand">
        Account
      </h1>

      {/* Card 1 — Plan & Credits */}
      <PixelCard>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-[family-name:var(--font-press-start)] text-sm text-brand">
                {allowance.name} Plan
              </h2>
              {isFree ? (
                <p className="mt-1 text-xs text-brand/60">
                  {allowance.total} free {allowance.unitLabel} to try it out
                </p>
              ) : (
                <p className="mt-1 text-xs text-brand/60">
                  {legacyPlan ? `$${legacyPlan.price}/mo ` : ""}
                  {legacyPlan ? <>&middot; </> : null}
                  {allowance.total.toLocaleString()} {allowance.unitLabel}/mo
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {!isFree && <ManageBillingButton />}
              <Link
                href="/admin/account/upgrade"
                className="font-[family-name:var(--font-press-start)] text-[10px] px-3 py-2 border-2 border-brand bg-gold text-brand shadow-[3px_3px_0_var(--color-brand)] hover:shadow-[1px_1px_0_var(--color-brand)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
              >
                {isFree ? "View Plans" : "Upgrade"}
              </Link>
            </div>
          </div>

          {/* Credit bar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-brand/60">
                {allowance.unitLabel === "posts" ? "Posts remaining" : "Credits remaining"}
              </span>
              <span className="font-[family-name:var(--font-press-start)] text-xs text-brand">
                {allowance.remaining} / {allowance.total}
              </span>
            </div>
            <CreditBar remaining={allowance.remaining} total={allowance.total} />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-brand/10 sm:grid-cols-4">
            <div>
              <p className="font-[family-name:var(--font-press-start)] text-lg text-brand">
                {stats.creditsUsedThisMonth}
              </p>
              <p className="text-xs text-brand/60">Used this month</p>
            </div>
            <div>
              <p className="font-[family-name:var(--font-press-start)] text-lg text-brand">
                {stats.totalReleases}
              </p>
              <p className="text-xs text-brand/60">Total releases</p>
            </div>
            <div>
              <p className="font-[family-name:var(--font-press-start)] text-lg text-brand">
                {stats.totalImages}
              </p>
              <p className="text-xs text-brand/60">Total images</p>
            </div>
            <div>
              <p className="font-[family-name:var(--font-press-start)] text-lg text-brand">
                {stats.totalVideos ?? 0}
              </p>
              <p className="text-xs text-brand/60">Total videos</p>
            </div>
          </div>
        </div>
      </PixelCard>

      {/* Danger Zone */}
      <div className="border-2 border-red-700 bg-red-50/80 p-5 shadow-[4px_4px_0_var(--color-brand)]">
        <h2 className="font-[family-name:var(--font-press-start)] text-sm text-red-700 mb-2">
          Danger Zone
        </h2>
        <p className="text-sm text-red-700/70 mb-4">
          Permanently delete your account and all associated data. This action
          cannot be undone. All releases, templates, brands, and API keys will
          be destroyed.
        </p>
        <DeleteAccountDialog userEmail={user.email} />
      </div>
    </div>
  );
}
