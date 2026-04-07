import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { redirect } from "next/navigation";
import { PixelCard } from "@/components/dashboard/pixel-card";
import { KeyManager } from "@/components/dashboard/key-manager";
import { DeleteAccountDialog } from "@/components/dashboard/delete-account-dialog";
import { PLANS } from "@/lib/plans";
import { ManageBillingButton } from "./manage-billing-button";
import Link from "next/link";
import { GitHubSection } from "@/components/dashboard/github-section";

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

  const [installations, brands, defaultTemplates, userTemplates, skippedReleases] =
    await Promise.all([
      fetchQuery(api.githubInstallations.listByUserId, { userId: user._id }),
      fetchQuery(api.brands.listByUser, { userId: user._id }),
      fetchQuery(api.templates.listDefaults, {}),
      fetchQuery(api.templates.listByUser, { userId: user._id }),
      fetchQuery(api.githubSkippedReleases.listByUserId, { userId: user._id }),
    ]);

  const allTemplates = [...defaultTemplates, ...userTemplates].map((t) => ({
    externalId: t.externalId,
    name: t.name,
  }));
  const brandList = brands.map((b) => ({ externalId: b.externalId, name: b.name }));

  const plan = PLANS[stats.plan as keyof typeof PLANS];
  const isTrial = stats.plan === "trial";

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
                {plan.name} Plan
              </h2>
              {isTrial ? (
                <p className="mt-1 text-xs text-brand/60">
                  30 free credits to try it out
                </p>
              ) : (
                <p className="mt-1 text-xs text-brand/60">
                  ${plan.price}/mo &middot; {plan.credits.toLocaleString()}{" "}
                  credits/mo
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {!isTrial && <ManageBillingButton />}
              <Link
                href="/dashboard/account/upgrade"
                className="font-[family-name:var(--font-press-start)] text-[10px] px-3 py-2 border-2 border-brand bg-gold text-brand shadow-[3px_3px_0_var(--color-brand)] hover:shadow-[1px_1px_0_var(--color-brand)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
              >
                {isTrial ? "View Plans" : "Upgrade"}
              </Link>
            </div>
          </div>

          {/* Credit bar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-brand/60">
                Credits remaining
              </span>
              <span className="font-[family-name:var(--font-press-start)] text-xs text-brand">
                {stats.creditsRemaining} / {plan.credits}
              </span>
            </div>
            <CreditBar remaining={stats.creditsRemaining} total={plan.credits} />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 pt-2 border-t border-brand/10">
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
          </div>
        </div>
      </PixelCard>

      {/* Card 2 — API Keys */}
      <PixelCard>
        <h2 className="font-[family-name:var(--font-press-start)] text-sm text-brand mb-4">
          API Keys
        </h2>
        <KeyManager />
      </PixelCard>

      {/* Card 3 — GitHub Integration */}
      <PixelCard>
        <h2 className="font-[family-name:var(--font-press-start)] text-sm text-brand mb-4">
          GitHub Integration
        </h2>
        <GitHubSection
          installations={installations}
          brands={brandList}
          templates={allTemplates}
          skippedReleases={skippedReleases}
          appSlug={process.env.NEXT_PUBLIC_GITHUB_APP_SLUG ?? ""}
        />
      </PixelCard>

      {/* Card 4 — Danger Zone */}
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
