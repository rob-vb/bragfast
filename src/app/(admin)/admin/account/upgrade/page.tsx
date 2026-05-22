// S4.1: upgrade page surfaces new tiers (Toast/Plate/Buffet) for paid checkout.
// Legacy plans (starter/pro/scale) remain billable via webhook routing for
// already-subscribed customers; this page only sells the new model.
import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { redirect } from "next/navigation";
// Stub: pricing-data deleted in 08-04; upgrade page reworked in 08-05+
import { Check, X } from "lucide-react";
type NewTierId = "plate";
type NewTierConfig = { id: NewTierId; name: string; price: number; label: string; blurb: string };
const NEW_TIERS: NewTierConfig[] = [
  { id: "plate", name: "Full Plate", price: 29, label: "$29/mo", blurb: "Unlimited renders." },
];
const FEATURES: { name: string; plate?: string | boolean; section?: boolean; [key: string]: string | boolean | undefined }[] = [
  { name: "Posts / month", plate: "Unlimited" },
  { name: "Image", plate: true },
  { name: "Video", plate: true },
];
function FeatureValue({ value, align = "center" }: { value: string | boolean; align?: "center" | "right" }) {
  const iconAlign = align === "center" ? "mx-auto" : "ml-auto";
  if (value === true) return <Check className={`${iconAlign} h-4 w-4 text-brand`} />;
  if (value === false) return <X className={`${iconAlign} h-4 w-4 text-brand/30`} />;
  return <span className="font-[family-name:var(--font-geist-sans)] text-sm text-brand">{value}</span>;
}
import { UpgradeButton } from "./upgrade-button";
import Link from "next/link";

const LEGACY_TO_NEW: Record<string, string> = {
  trial: "free",
  starter: "toast",
  pro: "plate",
  scale: "buffet",
};

export default async function UpgradePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const stats = await fetchQuery(api.userProfiles.getStats, {
    userId: user._id,
  });

  const currentTier = LEGACY_TO_NEW[stats.plan] ?? stats.plan;

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
          Upgrade Plan
        </h1>
      </div>

      {/* Pricing Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {NEW_TIERS.map((tier) => (
          <TierCard
            key={tier.id}
            tier={tier}
            currentTier={currentTier}
            featured={tier.id === "plate"}
          />
        ))}
      </div>

      {/* Feature Comparison */}
      <div>
        <h2 className="font-[family-name:var(--font-press-start)] text-sm text-brand text-center mb-6">
          Compare tiers
        </h2>

        {/* Desktop table */}
        <div className="hidden md:block border-2 border-brand shadow-[4px_4px_0_var(--color-brand)] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-brand bg-surface">
                <th className="text-left px-4 py-3 font-[family-name:var(--font-press-start)] text-[9px]">
                  Feature
                </th>
                {NEW_TIERS.map((tier) => (
                  <th
                    key={tier.id}
                    className={`px-4 py-3 font-[family-name:var(--font-press-start)] text-[9px] text-center ${
                      tier.id === "plate" ? "bg-gold" : ""
                    }`}
                  >
                    {tier.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FEATURES.map((feature, i) => {
                if (feature.section) {
                  return (
                    <tr key={feature.name}>
                      <td
                        colSpan={4}
                        className="px-4 py-2 bg-brand/5 border-y border-brand/15"
                      >
                        <span className="font-[family-name:var(--font-press-start)] text-[8px] text-brand/40 uppercase tracking-wider">
                          {feature.name}
                        </span>
                      </td>
                    </tr>
                  );
                }
                return (
                  <tr
                    key={feature.name}
                    className={`border-b border-brand/10 ${
                      i % 2 === 0 ? "bg-white" : "bg-surface/50"
                    }`}
                  >
                    <td className="px-4 py-3 font-[family-name:var(--font-geist-sans)] text-sm text-brand/80">
                      {feature.name}
                    </td>
                    {(["toast", "plate", "buffet"] as const).map((tierId) => (
                      <td
                        key={tierId}
                        className={`px-4 py-3 text-center ${
                          tierId === "plate" ? "bg-gold/10" : ""
                        }`}
                      >
                        <FeatureValue value={feature[tierId] ?? false} />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile: stacked cards */}
        <div className="md:hidden space-y-6">
          {NEW_TIERS.map((tier) => (
            <div
              key={tier.id}
              className={`border-2 border-brand shadow-[3px_3px_0_var(--color-brand)] overflow-hidden ${
                tier.id === "plate" ? "bg-gold" : "bg-white"
              }`}
            >
              <div className="px-4 py-3 border-b-2 border-brand">
                <span className="font-[family-name:var(--font-press-start)] text-[10px]">
                  {tier.name}
                </span>
                <span className="font-[family-name:var(--font-geist-sans)] text-sm ml-2 text-brand/70">
                  ${tier.price}/mo
                </span>
              </div>
              <ul className="divide-y divide-[var(--color-brand)]/10">
                {FEATURES.map((feature) => {
                  if (feature.section) {
                    return (
                      <li key={feature.name} className="px-4 py-2 bg-brand/5">
                        <span className="font-[family-name:var(--font-press-start)] text-[8px] text-brand/40 uppercase tracking-wider">
                          {feature.name}
                        </span>
                      </li>
                    );
                  }
                  return (
                    <li
                      key={feature.name}
                      className="flex items-center justify-between px-4 py-2.5"
                    >
                      <span className="font-[family-name:var(--font-geist-sans)] text-xs text-brand/70">
                        {feature.name}
                      </span>
                      <FeatureValue value={feature[tier.id] ?? false} />
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TierCard({
  tier,
  currentTier,
  featured,
}: {
  tier: NewTierConfig;
  currentTier: string;
  featured?: boolean;
}) {
  const isCurrent = tier.id === currentTier;
  const postsValue = FEATURES[0][tier.id] as string;

  return (
    <div
      className={`relative border-2 border-brand p-5 flex flex-col ${
        featured
          ? "bg-white shadow-[6px_6px_0_var(--color-brand)] md:-translate-y-2"
          : "bg-white shadow-[3px_3px_0_var(--color-brand)]"
      }`}
    >
      {isCurrent && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 font-[family-name:var(--font-press-start)] text-[8px] bg-brand text-[var(--color-surface)] px-2 py-1 whitespace-nowrap border border-brand">
          Current Plan
        </span>
      )}
      {!isCurrent && featured && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 font-[family-name:var(--font-press-start)] text-[8px] bg-brand text-[var(--color-surface)] px-2 py-1 whitespace-nowrap border border-brand">
          Most popular
        </span>
      )}

      <h3 className="font-[family-name:var(--font-press-start)] text-[10px] mb-3">
        {tier.name}
      </h3>

      <div className="mb-1">
        <span className="font-[family-name:var(--font-press-start)] text-xl md:text-2xl">
          ${tier.price}
        </span>
        <span className="font-[family-name:var(--font-geist-sans)] text-sm text-brand/60">
          /mo
        </span>
      </div>

      <p className="font-[family-name:var(--font-geist-sans)] text-sm text-brand/70 mb-4">
        {postsValue} credits/month
      </p>

      <p className="font-[family-name:var(--font-geist-sans)] text-xs text-brand/50 mb-5">
        {tier.label}
      </p>

      <div className="mt-auto">
        {isCurrent ? (
          <span className="block text-center font-[family-name:var(--font-press-start)] text-[10px] px-4 py-3 border-2 border-brand/30 text-brand/50 bg-brand/5">
            Current Plan
          </span>
        ) : (
          <UpgradeButton planId={tier.id} />
        )}
      </div>
    </div>
  );
}
