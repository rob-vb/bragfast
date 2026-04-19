import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { LandingNav } from "@/components/landing/landing-nav";
import { PAID_PLANS } from "@/lib/plans";
import { FEATURES, FeatureValue } from "@/lib/pricing-data";

export const metadata: Metadata = {
  title: "Pricing | brag.fast",
  description:
    "Simple pricing. Images: 1 credit. Videos: 5 credits. Start with 30 free credits, no card.",
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
      <section className="relative pt-16 pb-16 md:pt-24 md:pb-20 bg-white border-b-2 border-brand overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(var(--color-brand) 1px, transparent 1px), linear-gradient(90deg, var(--color-brand) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        <div className="relative mx-auto max-w-3xl px-4 md:px-8 text-center">
          <div className="inline-flex items-center gap-2 border-2 border-brand bg-gold/20 px-2.5 py-1 mb-5">
            <span className="w-1.5 h-1.5 bg-gold animate-pulse" />
            <span className="font-[family-name:var(--font-press-start)] text-[8px] uppercase tracking-wider">
              Plans
            </span>
          </div>
          <h1 className="font-[family-name:var(--font-press-start)] text-2xl md:text-4xl leading-[1.4] mb-5">
            Simple <span className="text-gold">prices.</span> No surprises.
          </h1>
          <p className="font-[family-name:var(--font-geist-sans)] text-base md:text-lg text-brand/80 leading-relaxed max-w-xl mx-auto mb-2">
            Images: 1 credit. Videos: 5 credits. Same price whether you render
            it yourself or your agent does.
          </p>
          <p className="font-[family-name:var(--font-geist-sans)] text-sm md:text-base text-brand/60 leading-relaxed max-w-xl mx-auto">
            Sign up and get <strong className="text-brand">30 free credits</strong> to try it out. No card.
          </p>
        </div>
      </section>

      {/* Pricing menu board */}
      <section className="py-16 md:py-20 bg-surface border-b-2 border-brand">
        <div className="mx-auto max-w-2xl px-4 md:px-8">
          <div className="border-[3px] border-brand shadow-[6px_6px_0_var(--color-brand)] overflow-hidden">
            <div className="bg-brand text-gold px-5 py-4 text-center">
              <h2 className="font-[family-name:var(--font-press-start)] text-sm md:text-base">
                brag.fast plans
              </h2>
              <p className="font-[family-name:var(--font-geist-sans)] text-xs text-surface/60 mt-1">
                Images: 1 credit each. Videos: 5 credits each.
              </p>
            </div>

            <div className="bg-gold/20 px-5 py-3 flex items-center gap-3 border-b-2 border-brand/10">
              <span className="font-[family-name:var(--font-press-start)] text-[8px] bg-gold text-brand px-1.5 py-0.5 border border-brand shrink-0">
                Sign-up bonus
              </span>
              <p className="font-[family-name:var(--font-geist-sans)] text-xs text-brand/70 leading-snug">
                Every new account gets <strong>30 free credits</strong> to try it out. No card, one-time.
              </p>
            </div>

            <div className="divide-y-2 divide-brand/10">
              {PAID_PLANS.map((plan) => (
                <div
                  key={plan.id}
                  className={`px-5 py-4 flex items-center gap-4 ${
                    plan.id === "pro" ? "bg-gold/10" : "bg-white"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-[family-name:var(--font-press-start)] text-[10px]">
                        {plan.name}
                      </h3>
                      {plan.id === "pro" && (
                        <span className="font-[family-name:var(--font-press-start)] text-[7px] bg-brand text-gold px-1.5 py-0.5 border border-brand">
                          Popular
                        </span>
                      )}
                    </div>
                    <p className="font-[family-name:var(--font-geist-sans)] text-xs text-brand/50 mt-0.5">
                      {plan.label} &middot; {plan.credits.toLocaleString()} credits/mo
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-[family-name:var(--font-press-start)] text-base md:text-lg">
                      ${plan.price}
                    </span>
                    <span className="font-[family-name:var(--font-geist-sans)] text-xs text-brand/50">
                      /mo
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-surface px-5 py-4 text-center border-t-2 border-brand">
              <Link
                href="/signup"
                className="inline-block font-[family-name:var(--font-press-start)] text-[10px] px-6 py-3 border-2 border-brand bg-gold text-brand shadow-[3px_3px_0_var(--color-brand)] hover:shadow-[1px_1px_0_var(--color-brand)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
              >
                Start with 30 Free Credits
              </Link>
              <p className="font-[family-name:var(--font-geist-sans)] text-xs text-brand/50 mt-2">
                No card. Upgrade when you need more.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Comparison */}
      <section className="py-16 md:py-20 bg-white border-b-2 border-brand">
        <div className="mx-auto max-w-4xl px-4 md:px-8">
          <div className="text-center mb-10 md:mb-12">
            <span className="font-[family-name:var(--font-press-start)] text-[10px] uppercase tracking-wider text-brand/50 block mb-3">
              What&apos;s included
            </span>
            <h2 className="font-[family-name:var(--font-press-start)] text-sm md:text-xl leading-[1.5]">
              Compare plans.
            </h2>
          </div>

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
      <section className="py-16 md:py-24 bg-surface border-b-2 border-brand">
        <div className="mx-auto max-w-3xl px-4 md:px-8">
          <div className="text-center mb-12">
            <span className="font-[family-name:var(--font-press-start)] text-[10px] uppercase tracking-wider text-brand/50 block mb-3">
              The details
            </span>
            <h2 className="font-[family-name:var(--font-press-start)] text-sm md:text-xl leading-[1.5]">
              Frequently asked.
            </h2>
          </div>
          <div className="flex flex-col gap-4">
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
        <div className="relative mx-auto max-w-3xl px-4 md:px-8 text-center">
          <h2 className="font-[family-name:var(--font-press-start)] text-xl md:text-3xl leading-[1.4] mb-5">
            Start free. <span className="block md:inline">Upgrade when you&apos;re ready.</span>
          </h2>
          <p className="font-[family-name:var(--font-geist-sans)] text-base md:text-lg text-brand/80 leading-relaxed mb-8 max-w-xl mx-auto">
            30 free credits. No credit card. First render in under a minute.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup"
              className="inline-block font-[family-name:var(--font-press-start)] text-xs md:text-sm px-6 py-4 text-brand border-2 border-brand bg-white shadow-[4px_4px_0_var(--color-brand)] hover:shadow-[2px_2px_0_var(--color-brand)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
            >
              Start for free
            </Link>
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
