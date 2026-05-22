import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { redirect } from "next/navigation";
import { PixelCard } from "@/components/admin/pixel-card";
import { DeleteAccountDialog } from "@/components/admin/delete-account-dialog";
import { ManageBillingButton } from "./manage-billing-button";
import Link from "next/link";

export default async function AccountPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const stats = await fetchQuery(api.userProfiles.getStats, {
    userId: user._id,
  });

  const plan = stats.plan;
  const trialEnd = stats.trialEnd ?? null;
  const now = Date.now();

  const isTrialActive = plan === "trial" && trialEnd !== null && trialEnd > now;
  const isTrialExpired = plan === "trial" && (trialEnd === null || trialEnd <= now);
  const isFree = plan === "free";
  const isSubscribed = plan === "plate";

  const trialDaysLeft = isTrialActive && trialEnd
    ? Math.ceil((trialEnd - now) / (24 * 60 * 60 * 1000))
    : 0;

  return (
    <div className="space-y-8">
      <h1 className="font-[family-name:var(--font-press-start)] text-lg text-brand">
        Account
      </h1>

      {/* Card 1 — Plan & Subscription Status */}
      <PixelCard>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-[family-name:var(--font-press-start)] text-sm text-brand">
                {isSubscribed ? "Full Plate" : isTrialActive ? "On the House" : "Free"}
              </h2>
              {isTrialActive && (
                <p className="mt-1 font-[family-name:var(--font-geist-sans)] text-sm text-brand/70">
                  {trialDaysLeft} day{trialDaysLeft !== 1 ? "s" : ""} left in your trial
                </p>
              )}
              {isTrialExpired && (
                <p className="mt-1 font-[family-name:var(--font-geist-sans)] text-sm text-red-600">
                  Trial ended
                </p>
              )}
              {isFree && (
                <p className="mt-1 font-[family-name:var(--font-geist-sans)] text-sm text-brand/60">
                  No active subscription
                </p>
              )}
              {isSubscribed && (
                <p className="mt-1 font-[family-name:var(--font-geist-sans)] text-sm text-brand/70">
                  $29/mo &middot; Subscribed
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {isSubscribed && <ManageBillingButton />}
              {!isSubscribed && (
                <Link
                  href="/admin/account/upgrade"
                  className="font-[family-name:var(--font-press-start)] text-[10px] px-3 py-2 border-2 border-brand bg-gold text-brand shadow-[3px_3px_0_var(--color-brand)] hover:shadow-[1px_1px_0_var(--color-brand)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                >
                  Subscribe Now
                </Link>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-brand/10 sm:grid-cols-3">
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
