"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

type Plan = {
  title: string;
  body: string;
  cta: string;
  href: string;
};

const PLANS: Record<string, Plan> = {
  revenue: {
    title: "Connect Stripe",
    body: "Revenue goals fire when your Stripe MRR or total revenue crosses the line you set.",
    cta: "▸ Connect Stripe",
    href: "/admin/sous-chef?connect=stripe",
  },
  users: {
    title: "Connect Stripe",
    body: "User goals read active subscribers from Stripe.",
    cta: "▸ Connect Stripe",
    href: "/admin/sous-chef?connect=stripe",
  },
  traffic: {
    title: "Connect PostHog or GA4",
    body: "Traffic goals read visitor counts from PostHog or Google Analytics 4.",
    cta: "▸ Connect a traffic source",
    href: "/admin/sous-chef?connect=traffic",
  },
  custom: {
    title: "No source needed",
    body: "Custom goals are tracked by you. Mark it hit when it happens — brag.fast drafts a post on demand.",
    cta: "▸ Open dashboard",
    href: "/admin",
  },
  skip: {
    title: "You can connect a source later",
    body: "Hook up Stripe, PostHog, or GA4 from the Sous-chef page whenever you're ready.",
    cta: "▸ Open dashboard",
    href: "/admin",
  },
};

export function IntegrationStepClient() {
  const params = useSearchParams();
  const cat = params?.get("cat") ?? "skip";
  const plan = PLANS[cat] ?? PLANS.skip;

  return (
    <>
      <h1 className="font-[family-name:var(--font-press-start)] text-xl md:text-2xl leading-[1.4]">
        {plan.title}
      </h1>
      <p className="font-[family-name:var(--font-geist-sans)] text-base leading-relaxed text-brand/80">
        {plan.body}
      </p>
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Link
          href={plan.href}
          className="inline-flex items-center justify-center font-mono text-xs uppercase tracking-widest font-bold text-brand bg-gold border-2 border-brand px-6 py-3 shadow-[3px_3px_0_var(--color-brand)] transition-all hover:shadow-[1px_1px_0_var(--color-brand)] hover:translate-x-[2px] hover:translate-y-[2px]"
        >
          {plan.cta}
        </Link>
        <Link
          href="/admin"
          className="inline-flex items-center justify-center font-mono text-xs uppercase tracking-widest font-bold text-brand bg-white border-2 border-brand px-6 py-3 shadow-[3px_3px_0_var(--color-brand)]"
        >
          Skip — go to dashboard
        </Link>
      </div>
    </>
  );
}
