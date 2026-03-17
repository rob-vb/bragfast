import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { LandingNav } from "@/components/landing/landing-nav";
import { PAID_PLANS, type PlanConfig } from "@/lib/plans";
import { FEATURES, FeatureValue } from "@/lib/pricing-data";

export const metadata: Metadata = {
  title: "Pricing — brag.fast",
  description:
    "Simple, predictable pricing. 1 credit = 1 image in 1 format. Start free, scale as you grow.",
};

const FAQS = [
  {
    q: "What counts as 1 credit?",
    a: "1 credit = 1 image in 1 format. A release with 2 slides in 3 formats (landscape, square, portrait) uses 6 credits.",
  },
  {
    q: "Do unused credits roll over?",
    a: "No. Credits reset each billing cycle. Pick the plan that matches your monthly volume.",
  },
  {
    q: "Can I change plans anytime?",
    a: "Yes. Upgrade instantly, downgrade at the end of your billing cycle. No lock-in.",
  },
  {
    q: "What happens when I run out of credits?",
    a: "API calls will return a 429 error. Upgrade your plan or wait for the next billing cycle.",
  },
  {
    q: "How long are images stored?",
    a: "Images are hosted on our global CDN indefinitely. Hotlink them directly in your posts, blog, or app.",
  },
  {
    q: "How does the GitHub integration work?",
    a: "Install the brag.fast GitHub App, choose which repos to connect, and configure your template. Every time you publish a release, we auto-generate branded images. Review them first or let it run fully automated.",
  },
  {
    q: "What does AI analysis do?",
    a: "When a release comes in via GitHub, our AI reads the changelog, categorizes changes into features, bug fixes, and breaking changes, and generates a summary for your images. Available on all paid plans.",
  },
  {
    q: "Do you offer refunds?",
    a: "No. All plans are prepaid and non-refundable. You can cancel or downgrade anytime — changes take effect at the end of your billing cycle.",
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-surface text-brand">
      <LandingNav />

      {/* Hero */}
      <section className="px-4 pt-16 pb-12 md:pt-24 md:pb-16 md:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="font-[family-name:var(--font-press-start)] text-lg md:text-2xl leading-relaxed mb-4">
            Start showing what you&apos;ve been cooking.
          </h1>
          <p className="font-[family-name:var(--font-geist-sans)] text-sm md:text-base text-brand/60 mb-3">
            Auto-generate branded social images from your releases — via API or GitHub.
          </p>
          <p className="font-[family-name:var(--font-geist-sans)] text-base md:text-lg text-brand/70 leading-relaxed max-w-xl mx-auto">
            1 credit = 1 image in 1 format. Sign up and get{" "}
            <strong className="text-brand">30 free credits</strong> to
            try it out —{" "}
            <strong className="text-brand">no credit card required</strong>.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="px-4 pb-16 md:pb-20 md:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="grid gap-4 md:grid-cols-3">
            {PAID_PLANS.map((plan) => (
              <PricingCard key={plan.id} plan={plan} featured={plan.id === "pro"} />
            ))}
          </div>
        </div>
      </section>

      {/* Feature Comparison */}
      <section className="px-4 py-16 md:py-20 md:px-8 bg-white border-y-2 border-brand">
        <div className="mx-auto max-w-4xl">
          <h2 className="font-[family-name:var(--font-press-start)] text-sm md:text-base text-center mb-10">
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
                    {(["starter", "pro", "scale"] as const).map(
                      (planId) => (
                        <td
                          key={planId}
                          className={`px-4 py-3 text-center ${
                            planId === "pro" ? "bg-gold/10" : ""
                          }`}
                        >
                          <FeatureValue value={feature[planId]} />
                        </td>
                      )
                    )}
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
                <ul className="divide-y divide-brand/10">
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
      </section>

      {/* FAQ */}
      <section className="px-4 py-16 md:py-20 md:px-8">
        <div className="mx-auto max-w-2xl">
          <h2 className="font-[family-name:var(--font-press-start)] text-sm md:text-base text-center mb-10">
            Frequently Asked Questions
          </h2>
          <dl className="space-y-6">
            {FAQS.map((faq) => (
              <div key={faq.q}>
                <dt className="font-[family-name:var(--font-press-start)] text-[10px] md:text-xs mb-2">
                  {faq.q}
                </dt>
                <dd className="font-[family-name:var(--font-geist-sans)] text-sm text-brand/70 leading-relaxed">
                  {faq.a}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-4 py-16 md:py-24 md:px-8 bg-gold border-t-2 border-brand">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-[family-name:var(--font-press-start)] text-sm md:text-lg mb-4">
            Start free. Upgrade when you&apos;re ready.
          </h2>
          <p className="font-[family-name:var(--font-geist-sans)] text-sm md:text-base text-brand/80 leading-relaxed mb-8">
            30 free credits. No credit card required.
          </p>
          <Link
            href="/signup"
            className="inline-block font-[family-name:var(--font-press-start)] text-xs md:text-sm px-6 py-4 text-surface border-2 border-brand bg-brand shadow-[4px_4px_0_rgba(0,0,0,0.3)] hover:shadow-[2px_2px_0_rgba(0,0,0,0.3)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
          >
            Get 30 Free Credits
          </Link>
        </div>
      </section>
      {/* Footer */}
      <footer className="py-8 border-t-2 border-brand bg-surface">
        <div className="mx-auto max-w-5xl px-4 md:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logo.svg"
              alt="brag.fast"
              width={80}
              height={20}
              className="h-5 w-auto"
            />
          </Link>
          <p className="font-[family-name:var(--font-press-start)] text-[8px] text-brand/60">
            Feed your audience
          </p>
          <div className="flex items-center gap-4">
            <Link
              href="/terms"
              className="font-[family-name:var(--font-geist-sans)] text-xs text-brand/50 hover:text-brand/80 transition-colors"
            >
              Terms
            </Link>
            <Link
              href="/privacy"
              className="font-[family-name:var(--font-geist-sans)] text-xs text-brand/50 hover:text-brand/80 transition-colors"
            >
              Privacy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function PricingCard({
  plan,
  featured,
}: {
  plan: PlanConfig;
  featured?: boolean;
}) {
  return (
    <div
      className={`relative border-2 border-brand p-5 flex flex-col ${
        featured
          ? "bg-white shadow-[6px_6px_0_var(--color-brand)] md:-translate-y-2"
          : "bg-white shadow-[3px_3px_0_var(--color-brand)]"
      }`}
    >
      {featured && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 font-[family-name:var(--font-press-start)] text-[8px] bg-brand text-surface px-2 py-1 whitespace-nowrap border border-brand">
          Most popular
        </span>
      )}

      <h3 className="font-[family-name:var(--font-press-start)] text-[10px] mb-3">
        {plan.name}
      </h3>

      <div className="mb-1">
        {plan.price === 0 ? (
          <span className="font-[family-name:var(--font-press-start)] text-xl md:text-2xl">
            Free
          </span>
        ) : (
          <>
            <span className="font-[family-name:var(--font-press-start)] text-xl md:text-2xl">
              ${plan.price}
            </span>
            <span className="font-[family-name:var(--font-geist-sans)] text-sm text-brand/60">
              /mo
            </span>
          </>
        )}
      </div>

      <p className="font-[family-name:var(--font-geist-sans)] text-sm text-brand/70 mb-4">
        {plan.credits.toLocaleString()} credits{plan.price > 0 ? "/mo" : ""}
      </p>

      <p className="font-[family-name:var(--font-geist-sans)] text-xs text-brand/50 mb-5">
        {plan.label}
      </p>

      <div className="mt-auto">
        <Link
          href="/signup"
          className="block text-center font-[family-name:var(--font-press-start)] text-[10px] px-4 py-3 border-2 border-brand transition-all bg-gold text-brand shadow-[3px_3px_0_var(--color-brand)] hover:shadow-[1px_1px_0_var(--color-brand)] hover:translate-x-[2px] hover:translate-y-[2px]"
        >
          {plan.price === 0 ? "Start Free" : "Get Started"}
        </Link>
      </div>
    </div>
  );
}
