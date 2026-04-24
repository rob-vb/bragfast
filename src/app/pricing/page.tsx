import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { LandingNav } from "@/components/landing/landing-nav";
import { CtaLink } from "@/components/landing/cta-link";
import { PAID_PLANS } from "@/lib/plans";
import { FEATURES, FeatureValue } from "@/lib/pricing-data";

export const metadata: Metadata = {
  title: "Pricing | brag.fast",
  description:
    "Simple pricing. Images: 1 credit. Videos: 5 credits. Start with 30 free credits, no credit card needed.",
  alternates: { canonical: "/pricing" },
};

const FAQS = [
  {
    q: "How do credits work?",
    a: "Images cost 1 credit per format. Videos cost 5 credits per format. Example: one win rendered in all 3 formats = 3 image credits or 15 video credits.",
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
    a: "API calls return a 429 error. Upgrade your plan or wait for the next billing cycle.",
  },
  {
    q: "How long are images stored?",
    a: "Images are hosted on our global CDN indefinitely. Hotlink them directly in your posts, blog, or app.",
  },
  {
    q: "How does the MCP / agent integration work?",
    a: "Add the brag.fast MCP to Claude Desktop or Claude Code and the agent can generate images and video on your behalf — it reads your data, picks your brand, renders the visuals. Same thing over the REST API from any other agent or app.",
  },
  {
    q: "What does AI analysis do?",
    a: "For software releases, our AI reads your changelog and categorizes changes into features, fixes, and breaking changes. For other inputs — stats, milestones, screenshots — you pass the copy directly. Available on all paid plans.",
  },
  {
    q: "Do you offer refunds?",
    a: "No. All plans are prepaid and non-refundable. You can cancel or downgrade anytime. Changes take effect at the end of your billing cycle.",
  },
  {
    q: "How does the GitHub integration work?",
    a: "Install the brag.fast GitHub App on your repos. Every time you publish a release, we generate branded images. Review first or let it run on autopilot.",
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-surface text-brand">
      <LandingNav />

      {/* Hero */}
      <section className="relative pt-16 pb-20 md:pt-24 md:pb-28 bg-white border-b-2 border-brand overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(var(--color-brand) 1px, transparent 1px), linear-gradient(90deg, var(--color-brand) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-4 md:px-10 text-center">
          <div className="flex items-center justify-center gap-2.5 mb-6">
            <div className="w-6 h-[3px] bg-gold" />
            <span className="font-[family-name:var(--font-press-start)] text-[8px] text-gold uppercase tracking-wider">
              Pricing
            </span>
          </div>
          <h1 className="font-[family-name:var(--font-press-start)] text-2xl md:text-4xl leading-[1.4] mb-6">
            Simple prices.
            <br className="hidden md:block" /> No surprises.
          </h1>
          <p className="font-[family-name:var(--font-geist-sans)] text-base md:text-lg text-brand/80 leading-relaxed max-w-xl mx-auto mb-3">
            Images: 1 credit. Videos: 5 credits. Same price whether you render
            it yourself or your agent does.
          </p>
          <p className="font-[family-name:var(--font-geist-sans)] text-sm text-brand/60">
            New accounts get{" "}
            <strong className="text-brand">30 free credits</strong> to try it
            out. No credit card needed.
          </p>
        </div>
      </section>

      {/* Pricing cards */}
      <section className="py-16 md:py-24 bg-surface border-b-2 border-brand">
        <div className="mx-auto max-w-6xl px-4 md:px-10">
          <div className="mb-12 md:mb-16 text-center">
            <div className="flex items-center justify-center gap-2.5 mb-5">
              <div className="w-6 h-[3px] bg-gold" />
              <span className="font-[family-name:var(--font-press-start)] text-[8px] text-gold uppercase tracking-wider">
                Plans
              </span>
            </div>
            <h2 className="font-[family-name:var(--font-press-start)] text-base md:text-2xl leading-[1.4] mb-3">
              What are you having?
            </h2>
            <p className="font-[family-name:var(--font-geist-sans)] text-sm text-brand/60">
              Images: 1 credit each. Videos: 5 credits each.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {PAID_PLANS.map((plan) => {
              const isPopular = plan.id === "pro";
              return (
                <div
                  key={plan.id}
                  className="border-[3px] border-brand shadow-[6px_6px_0_var(--color-brand)] overflow-hidden flex flex-col"
                >
                  <div className="bg-brand px-5 py-4 flex items-center justify-between min-h-[56px]">
                    <span className="font-[family-name:var(--font-press-start)] text-[10px] text-gold">
                      &#9656; {plan.name}
                    </span>
                    {isPopular && (
                      <span className="font-[family-name:var(--font-press-start)] text-[7px] bg-gold text-brand px-2 py-1 border border-gold/60">
                        POPULAR
                      </span>
                    )}
                  </div>
                  <div className="bg-white p-5 flex flex-col gap-5 flex-1">
                    <p className="font-[family-name:var(--font-geist-sans)] text-sm text-brand/60">
                      {plan.label}
                    </p>
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="font-[family-name:var(--font-press-start)] text-3xl">
                          ${plan.price}
                        </span>
                        <span className="font-[family-name:var(--font-geist-sans)] text-sm text-brand/50">
                          /mo
                        </span>
                      </div>
                      <p className="font-[family-name:var(--font-press-start)] text-[9px] text-brand/50 mt-1.5">
                        {plan.credits.toLocaleString()} credits/mo
                      </p>
                    </div>
                    <div className="border-t-2 border-brand/10 pt-4">
                      <p className="font-[family-name:var(--font-press-start)] text-[9px] text-brand/40 leading-[2.2]">
                        {plan.credits.toLocaleString()} images
                        <br />
                        or {(plan.credits / 5).toLocaleString()} videos
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-10 md:mt-12 text-center">
            <CtaLink
              signedOutHref="/signup"
              signedInHref="/admin/billing"
              className="inline-block font-[family-name:var(--font-press-start)] text-[10px] px-6 py-3 border-2 border-brand bg-gold text-brand shadow-[3px_3px_0_var(--color-brand)] hover:shadow-[1px_1px_0_var(--color-brand)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
            >
              Start with 30 Free Credits
            </CtaLink>
            <p className="font-[family-name:var(--font-geist-sans)] text-xs text-brand/50 mt-2">
              No credit card needed. Upgrade when you need more.
            </p>
          </div>
        </div>
      </section>

      {/* Feature comparison */}
      <section className="py-16 md:py-20 bg-white border-b-2 border-brand">
        <div className="mx-auto max-w-6xl px-4 md:px-10">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-2.5 mb-5">
              <div className="w-6 h-[3px] bg-gold" />
              <span className="font-[family-name:var(--font-press-start)] text-[8px] text-gold uppercase tracking-wider">
                What&apos;s included
              </span>
            </div>
            <h2 className="font-[family-name:var(--font-press-start)] text-sm md:text-xl leading-[1.5]">
              Compare plans.
            </h2>
          </div>

          {/* Desktop table */}
          <div className="hidden md:block border-[3px] border-brand shadow-[6px_6px_0_var(--color-brand)] overflow-hidden">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="bg-brand text-left px-5 py-4 font-[family-name:var(--font-press-start)] text-[9px] text-gold border-b-2 border-brand w-2/5">
                    Feature
                  </th>
                  {PAID_PLANS.map((plan) => (
                    <th
                      key={plan.id}
                      className={`px-5 py-4 font-[family-name:var(--font-press-start)] text-[9px] text-center border-b-2 border-brand ${
                        plan.id === "pro"
                          ? "bg-gold text-brand"
                          : "bg-brand text-gold"
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
                      i % 2 === 0 ? "bg-white" : "bg-surface/60"
                    }`}
                  >
                    <td className="px-5 py-3 font-[family-name:var(--font-geist-sans)] text-sm text-brand/80">
                      {feature.name}
                    </td>
                    {(["starter", "pro", "scale"] as const).map((planId) => (
                      <td
                        key={planId}
                        className={`px-5 py-3 text-center ${
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

          {/* Mobile cards */}
          <div className="md:hidden flex flex-col gap-4">
            {PAID_PLANS.map((plan) => (
              <div
                key={plan.id}
                className="border-[3px] border-brand shadow-[4px_4px_0_var(--color-brand)] overflow-hidden"
              >
                <div className="bg-brand px-5 py-4 flex items-center justify-between">
                  <span className="font-[family-name:var(--font-press-start)] text-[10px] text-gold">
                    &#9656; {plan.name}
                  </span>
                  <span className="font-[family-name:var(--font-geist-sans)] text-sm text-gold/70">
                    ${plan.price}/mo
                  </span>
                </div>
                <ul className="bg-white divide-y divide-brand/10">
                  {FEATURES.map((feature) => {
                    const value = feature[plan.id as keyof typeof feature];
                    return (
                      <li
                        key={feature.name}
                        className="flex items-center justify-between px-5 py-3"
                      >
                        <span className="font-[family-name:var(--font-geist-sans)] text-sm text-brand/70">
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
      <section className="py-16 md:py-24 bg-surface border-b-2 border-brand">
        <div className="mx-auto max-w-6xl px-4 md:px-10">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-2.5 mb-5">
              <div className="w-6 h-[3px] bg-gold" />
              <span className="font-[family-name:var(--font-press-start)] text-[8px] text-gold uppercase tracking-wider">
                The details
              </span>
            </div>
            <h2 className="font-[family-name:var(--font-press-start)] text-sm md:text-xl leading-[1.5]">
              Frequently asked.
            </h2>
          </div>
          <div className="flex flex-col gap-4 max-w-3xl mx-auto">
            {FAQS.map((item, i) => (
              <details
                key={item.q}
                className="group border-2 border-brand bg-white shadow-[3px_3px_0_var(--color-brand)] open:shadow-[5px_5px_0_var(--color-brand)] transition-[box-shadow]"
              >
                <summary className="cursor-pointer list-none flex items-center gap-4 px-5 py-4 hover:bg-gold/10">
                  <span className="font-[family-name:var(--font-press-start)] text-[9px] text-brand/40 shrink-0">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="font-[family-name:var(--font-press-start)] text-[11px] md:text-xs flex-1 leading-relaxed">
                    {item.q}
                  </span>
                  <span className="font-[family-name:var(--font-press-start)] text-xs text-brand/60 shrink-0 group-open:rotate-45 transition-transform">
                    +
                  </span>
                </summary>
                <div className="px-5 pb-5 pt-0 pl-[4.5rem] border-t-2 border-brand/10">
                  <p className="font-[family-name:var(--font-geist-sans)] text-base text-brand/80 leading-relaxed pt-4">
                    {item.a}
                  </p>
                </div>
              </details>
            ))}
          </div>
        </div>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: FAQS.map((faq) => ({
                "@type": "Question",
                name: faq.q,
                acceptedAnswer: {
                  "@type": "Answer",
                  text: faq.a,
                },
              })),
            }),
          }}
        />
      </section>

      {/* Final CTA */}
      <section className="py-16 md:py-24 bg-gold border-b-2 border-brand relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "linear-gradient(var(--color-brand) 1px, transparent 1px), linear-gradient(90deg, var(--color-brand) 1px, transparent 1px)",
            backgroundSize: "16px 16px",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-4 md:px-10 text-center">
          <h2 className="font-[family-name:var(--font-press-start)] text-xl md:text-3xl leading-[1.4] mb-5">
            Start free.{" "}
            <span className="block md:inline">
              Upgrade when you&apos;re ready.
            </span>
          </h2>
          <p className="font-[family-name:var(--font-geist-sans)] text-base md:text-lg text-brand/80 leading-relaxed mb-8 max-w-xl mx-auto">
            30 free credits. No credit card. First render in under a minute.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <CtaLink
              signedOutHref="/signup"
              signedInHref="/admin"
              className="inline-block font-[family-name:var(--font-press-start)] text-xs md:text-sm px-6 py-4 text-brand border-2 border-brand bg-white shadow-[4px_4px_0_var(--color-brand)] hover:shadow-[2px_2px_0_var(--color-brand)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
            >
              Start for free
            </CtaLink>
            <Link
              href="/#mcp"
              className="inline-block font-[family-name:var(--font-press-start)] text-[10px] md:text-xs px-5 py-4 text-brand border-2 border-brand bg-transparent shadow-[3px_3px_0_var(--color-brand)] hover:bg-brand hover:text-gold hover:shadow-[1px_1px_0_var(--color-brand)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
            >
              Install MCP
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t-2 border-brand bg-surface">
        <div className="mx-auto max-w-6xl px-4 md:px-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logo.svg"
              alt="brag.fast"
              width={80}
              height={20}
              className="h-5 w-auto"
            />
          </Link>
          <p className="font-[family-name:var(--font-press-start)] text-[10px] text-brand/60">
            Feed your audience
          </p>
          <div className="flex items-center gap-4 flex-wrap justify-center">
            <Link
              href="/docs"
              className="font-[family-name:var(--font-geist-sans)] text-xs text-brand/50 hover:text-brand/80 transition-colors"
            >
              Docs
            </Link>
            <Link
              href="/pricing"
              className="font-[family-name:var(--font-geist-sans)] text-xs text-brand/50 hover:text-brand/80 transition-colors"
            >
              Pricing
            </Link>
            <Link
              href="/demo"
              className="font-[family-name:var(--font-geist-sans)] text-xs text-brand/50 hover:text-brand/80 transition-colors"
            >
              Demo
            </Link>
            <Link
              href="/support"
              className="font-[family-name:var(--font-geist-sans)] text-xs text-brand/50 hover:text-brand/80 transition-colors"
            >
              Support
            </Link>
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
