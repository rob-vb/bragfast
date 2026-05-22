import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { redirect } from "next/navigation";
import { UpgradeButton } from "./upgrade-button";
import Link from "next/link";

export default async function UpgradePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const stats = await fetchQuery(api.userProfiles.getStats, {
    userId: user._id,
  });

  const isSubscribed = stats.plan === "plate";

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/admin/account"
          className="text-xs text-brand/60 hover:text-brand transition-colors"
        >
          &larr; Back to Account
        </Link>
        <h1 className="mt-2 font-[family-name:var(--font-press-start)] text-lg text-brand">
          {isSubscribed ? "Manage Plan" : "Subscribe"}
        </h1>
      </div>

      {/* Single Plan Card */}
      <div className="max-w-sm">
        <div className="relative border-2 border-brand bg-white p-6 shadow-[6px_6px_0_var(--color-brand)] flex flex-col gap-4">
          {isSubscribed && (
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 font-[family-name:var(--font-press-start)] text-[8px] bg-brand text-[var(--color-surface)] px-2 py-1 whitespace-nowrap border border-brand">
              Current Plan
            </span>
          )}

          <div>
            <h2 className="font-[family-name:var(--font-press-start)] text-sm text-brand mb-1">
              Full Plate
            </h2>
            <p className="font-[family-name:var(--font-geist-sans)] text-xs text-brand/60">
              Everything you need to ship branded release images and videos.
            </p>
          </div>

          <div className="flex items-baseline gap-1">
            <span className="font-[family-name:var(--font-press-start)] text-3xl text-brand">
              $29
            </span>
            <span className="font-[family-name:var(--font-geist-sans)] text-sm text-brand/60">
              /mo
            </span>
          </div>

          <ul className="space-y-1 font-[family-name:var(--font-geist-sans)] text-sm text-brand/80">
            <li>&#10003; Unlimited renders</li>
            <li>&#10003; Image + video output</li>
            <li>&#10003; All formats (landscape, square, portrait)</li>
            <li>&#10003; Schedule &amp; post via Buffer</li>
            <li>&#10003; Custom brands &amp; templates</li>
          </ul>

          <div className="pt-2">
            {isSubscribed ? (
              <span className="block text-center font-[family-name:var(--font-press-start)] text-[10px] px-4 py-3 border-2 border-brand/30 text-brand/50 bg-brand/5">
                Current Plan
              </span>
            ) : (
              <UpgradeButton planId="plate" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
