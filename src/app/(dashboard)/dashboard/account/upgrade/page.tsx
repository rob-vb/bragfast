import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { redirect } from "next/navigation";
import { PAID_PLANS, type PlanConfig } from "@/lib/plans";
import { FEATURES, FeatureValue } from "@/lib/pricing-data";
import { UpgradeButton } from "./upgrade-button";
import Link from "next/link";

export default async function UpgradePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const stats = await fetchQuery(api.userProfiles.getStats, {
    userId: user._id,
  });

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/dashboard/account"
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
        {PAID_PLANS.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            currentPlan={stats.plan}
            featured={plan.id === "pro"}
          />
        ))}
      </div>

      {/* Feature Comparison */}
      <div>
        <h2 className="font-[family-name:var(--font-press-start)] text-sm text-brand text-center mb-6">
          Compare plans
        </h2>

        {/* Desktop table */}
        <div className="hidden md:block border-2 border-brand shadow-[4px_4px_0_var(--color-brand)] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-brand bg-surface">
                <th className="text-left px-4 py-3 font-[family-name:var(--font-press-start)] text-[9px]">
                  Feature
                </th>
                {PAID_PLANS.map((plan) => (
                  <th
                    key={plan.id}
                    className={`px-4 py-3 font-[family-name:var(--font-press-start)] text-[9px] text-center ${
                      plan.id === "pro" ? "bg-gold" : ""
                    }`}
                  >
                    {plan.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FEATURES.map((feature, i) => (
                <tr
                  key={feature.name}
                  className={`border-b border-brand/10 ${
                    i % 2 === 0 ? "bg-white" : "bg-surface/50"
                  }`}
                >
                  <td className="px-4 py-3 font-[family-name:var(--font-geist-sans)] text-sm text-brand/80">
                    {feature.name}
                  </td>
                  {(["starter", "pro", "scale"] as const).map((planId) => (
                    <td
                      key={planId}
                      className={`px-4 py-3 text-center ${
                        planId === "pro" ? "bg-gold/10" : ""
                      }`}
                    >
                      <FeatureValue value={feature[planId]} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile: stacked cards */}
        <div className="md:hidden space-y-6">
          {PAID_PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`border-2 border-brand shadow-[3px_3px_0_var(--color-brand)] overflow-hidden ${
                plan.id === "pro" ? "bg-gold" : "bg-white"
              }`}
            >
              <div className="px-4 py-3 border-b-2 border-brand">
                <span className="font-[family-name:var(--font-press-start)] text-[10px]">
                  {plan.name}
                </span>
                <span className="font-[family-name:var(--font-geist-sans)] text-sm ml-2 text-brand/70">
                  ${plan.price}/mo
                </span>
              </div>
              <ul className="divide-y divide-[var(--color-brand)]/10">
                {FEATURES.map((feature) => {
                  const value = feature[plan.id as keyof typeof feature];
                  return (
                    <li
                      key={feature.name}
                      className="flex items-center justify-between px-4 py-2.5"
                    >
                      <span className="font-[family-name:var(--font-geist-sans)] text-xs text-brand/70">
                        {feature.name}
                      </span>
                      <FeatureValue value={value as string | boolean} />
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

function PlanCard({
  plan,
  currentPlan,
  featured,
}: {
  plan: PlanConfig;
  currentPlan: string;
  featured?: boolean;
}) {
  const isCurrent = plan.id === currentPlan;

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
        {plan.name}
      </h3>

      <div className="mb-1">
        <span className="font-[family-name:var(--font-press-start)] text-xl md:text-2xl">
          ${plan.price}
        </span>
        <span className="font-[family-name:var(--font-geist-sans)] text-sm text-brand/60">
          /mo
        </span>
      </div>

      <p className="font-[family-name:var(--font-geist-sans)] text-sm text-brand/70 mb-4">
        {plan.credits.toLocaleString()} credits/mo
      </p>

      <p className="font-[family-name:var(--font-geist-sans)] text-xs text-brand/50 mb-5">
        {plan.label}
      </p>

      <div className="mt-auto">
        {isCurrent ? (
          <span className="block text-center font-[family-name:var(--font-press-start)] text-[10px] px-4 py-3 border-2 border-brand/30 text-brand/50 bg-brand/5">
            Current Plan
          </span>
        ) : (
          <UpgradeButton planId={plan.id} />
        )}
      </div>
    </div>
  );
}
