import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { LandingNav } from "@/components/landing/landing-nav";
import { BeforeAfter } from "@/components/landing/before-after";
import { HeroSocialStack } from "@/components/landing/social-card";
import { BrandKitMockup } from "@/components/landing/brand-kit-mockup";
import { LazyVideo } from "@/components/landing/lazy-video";
import { CtaLink } from "@/components/landing/cta-link";
import { PAID_PLANS } from "@/lib/plans";
import { getLaunchMode } from "@/lib/launch-mode";

export const metadata: Metadata = {
  title: "brag.fast | Build-in-public posts on autopilot",
  description:
    "brag.fast turns your wins into branded posts. Ship a feature, hit an MRR milestone, gain GitHub stars — your Sous-Chef drafts the post, you approve it, it goes out.",
  alternates: { canonical: "/" },
};

const FAQ = [
  {
    q: "What kind of wins work?",
    a: "Anything brag-worthy. New features for your app, MRR milestones, user-count screenshots, launch-day numbers, a before/after. If you'd post about it, brag.fast dresses it up.",
  },
  {
    q: "Will it match my brand?",
    a: "Upload your logo. Set colors and fonts. Every image out the door looks like you made it on purpose.",
  },
  {
    q: "Will video eat all my credits?",
    a: "5 credits per video per format. One video in all three formats = 15. Toast gives you 200 a month.",
  },
  {
    q: "What if the AI picks the wrong thing to highlight?",
    a: "Edit before you render. Or skip the AI and write the copy yourself. We are constantly optimizing the agent to produce the best results though.",
  },
  {
    q: "How does Sous-Chef (agent) know what to post?",
    a: "You connect the integrations you want: GitHub for merges and stars, Stripe for revenue milestones, PostHog for analytics, and more. Sous-Chef scans them on a schedule, drafts a post when it spots a win, and waits for you to cook it. You approve every post. Disconnect any integration any time.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-surface text-brand" data-launch-mode={getLaunchMode()}>
      <LandingNav />

      {/* S1: Hero */}
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
        <div className="relative mx-auto max-w-6xl px-4 md:px-10 grid md:grid-cols-[1.1fr_1fr] gap-10 md:gap-16 items-center">
          <div>
            <h1 className="font-[family-name:var(--font-press-start)] text-2xl md:text-4xl leading-[1.4] mb-6">
              Automate your build in public posts
            </h1>
            <p className="font-[family-name:var(--font-geist-sans)] text-base md:text-lg text-brand/80 max-w-xl mb-8 leading-relaxed">
              Turn any win into branded images and video: a release, an MRR record, a stars milestone. You can do it yourself, or Sous-Chef (agent) drafts it for you.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              <CtaLink
                signedOutHref="/signup"
                signedInHref="/admin"
                className="inline-flex items-center justify-center font-[family-name:var(--font-press-start)] text-xs md:text-sm px-6 py-4 text-brand border-2 border-brand bg-gold shadow-[4px_4px_0_var(--color-brand)] hover:shadow-[2px_2px_0_var(--color-brand)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
              >
                Get Started for Free
              </CtaLink>
            </div>
            <p className="font-[family-name:var(--font-geist-sans)] text-md text-brand/50 mt-4">
              30 credits. No credit card required.
            </p>
          </div>

          <div className="animate-[fade-in-up_0.6s_ease-out_both]">
            <HeroSocialStack />
          </div>
        </div>
      </section>

      {/* Sous-Chef audience section */}
      <section className="pt-16 md:pt-24 pb-0 bg-surface border-b-2 border-brand overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 md:px-10">
          <div className="grid md:grid-cols-[1fr_1.1fr] gap-10 md:gap-14">
            <div className="flex flex-col gap-5 pb-16 md:pb-24">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-[3px] bg-gold" />
                <span className="font-[family-name:var(--font-press-start)] text-[8px] text-gold uppercase tracking-wider">
                  Sous-Chef
                </span>
              </div>
              <h2 className="font-[family-name:var(--font-press-start)] text-base md:text-2xl leading-[1.4]">
                Your Sous-Chef (agent) spots your wins so you can focus on building.
              </h2>
              <p className="font-[family-name:var(--font-geist-sans)] text-base md:text-lg text-brand/80 leading-relaxed max-w-md">
                Sous-Chef watches your connected integrations. When a PR merges, a milestone hits, or stars jump, it drafts a post with your brand, waiting for you to add a screenshot and cook.
              </p>
              <CtaLink
                signedOutHref="/signup"
                signedInHref="/admin/sous-chef"
                className="inline-block self-start font-[family-name:var(--font-press-start)] text-[10px] px-4 py-3 mt-2 text-brand border-2 border-brand bg-gold shadow-[3px_3px_0_var(--color-brand)] hover:shadow-[1px_1px_0_var(--color-brand)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
              >
                Connect an integration
              </CtaLink>
            </div>
            <div className="relative self-stretch hidden md:block">
              <Image
                src="/cook/sous-chef.png"
                alt="Sous-Chef"
                width={418}
                height={940}
                className="absolute top-0 left-1/2 -translate-x-1/2 md:-translate-y-12 w-auto max-w-[240px] md:max-w-[300px] h-auto"
              />
            </div>
          </div>

        </div>
      </section>

      {/* Cook it yourself section */}
      <section
        id="kitchen"
        className="scroll-mt-16 py-16 md:py-24 bg-white border-b-2 border-brand"
      >
        <div className="mx-auto max-w-6xl px-4 md:px-10">
          <div className="grid md:grid-cols-[1.1fr_0.9fr] gap-10 md:gap-14 items-center">
            <div className="md:order-2 flex flex-col gap-5">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-[3px] bg-gold" />
                <span className="font-[family-name:var(--font-press-start)] text-[8px] text-gold uppercase tracking-wider">
                  Web app
                </span>
              </div>
              <h2 className="font-[family-name:var(--font-press-start)] text-base md:text-2xl leading-[1.4]">
                Cook it yourself.
              </h2>
              <p className="font-[family-name:var(--font-geist-sans)] text-base md:text-lg text-brand/80 leading-relaxed max-w-md">
                Drop a screenshot, a stat, or a screen recording. Pick a template. Get landscape, square, portrait, and video back, on brand, in under a minute.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {["16:9 Landscape", "1:1 Square", "4:5 Portrait", "MP4 Video"].map(
                  (t) => (
                    <span
                      key={t}
                      className="font-[family-name:var(--font-press-start)] text-[9px] px-2 py-1.5 border-2 border-brand bg-white"
                    >
                      {t}
                    </span>
                  ),
                )}
              </div>
              <CtaLink
                signedOutHref="/signup"
                signedInHref="/admin/kitchen"
                className="inline-block self-start font-[family-name:var(--font-press-start)] text-[10px] px-4 py-3 mt-2 text-brand border-2 border-brand bg-gold shadow-[3px_3px_0_var(--color-brand)] hover:shadow-[1px_1px_0_var(--color-brand)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
              >
                Make your first post
              </CtaLink>
            </div>
            <div className="md:order-1 border-2 border-brand bg-white p-3 md:p-4 shadow-[6px_6px_0_var(--color-brand)]">
              <div className="flex items-center justify-between border-b-2 border-brand/20 pb-2 mb-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-gold border border-brand" />
                  <span className="w-2 h-2 bg-brand/20 border border-brand" />
                  <span className="w-2 h-2 bg-brand/20 border border-brand" />
                </div>
                <span className="font-[family-name:var(--font-geist-mono)] text-[10px] text-brand/50">
                  brag.fast/admin/kitchen
                </span>
                <span className="font-[family-name:var(--font-press-start)] text-[8px] text-brand/50">
                  00:43
                </span>
              </div>
              <LazyVideo
                src="/demo/bragfast_cook_demo.mp4"
                className="w-full border border-brand"
              />
            </div>
          </div>
        </div>
      </section>

      {/* S5: Before/After */}
      <section className="py-16 md:py-24 bg-surface border-b-2 border-brand">
        <div className="mx-auto max-w-6xl px-4 md:px-10">
          <div className="text-center mb-10">
            <h2 className="font-[family-name:var(--font-press-start)] text-sm md:text-xl leading-[1.5] mb-3">
              Which post would you stop for?
            </h2>
            <p className="font-[family-name:var(--font-geist-sans)] text-base text-brand/60 max-w-xl mx-auto">
              Left: plain text. Right: a branded visual that cuts through the feed.
            </p>
          </div>
          <BeforeAfter />
        </div>
      </section>

      {/* S6: Templates + Brand Kits */}
      <section className="py-16 md:py-24 bg-white border-b-2 border-brand">
        <div className="mx-auto max-w-6xl px-4 md:px-10">
          <div className="grid md:grid-cols-2 gap-12 md:gap-16">
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-[3px] bg-gold" />
                <span className="font-[family-name:var(--font-press-start)] text-[8px] text-gold uppercase tracking-wider">
                  Templates
                </span>
              </div>
              <h3 className="font-[family-name:var(--font-press-start)] text-sm md:text-xl leading-[1.5]">
                Design it once. Reuse forever.
              </h3>
              <p className="font-[family-name:var(--font-geist-sans)] text-base md:text-lg text-brand/80 leading-relaxed">
                Drag objects. Set colors. Preview live. Every render follows the layout you built. No babysitting.
              </p>
              <div className="border-2 border-brand bg-white p-6 shadow-[4px_4px_0_var(--color-brand)]">
                <LazyVideo
                  src="/demo/template_editor_compressed.mp4"
                  className="w-full border border-brand"
                />
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-[3px] bg-gold" />
                <span className="font-[family-name:var(--font-press-start)] text-[8px] text-gold uppercase tracking-wider">
                  Branding
                </span>
              </div>
              <h3 className="font-[family-name:var(--font-press-start)] text-sm md:text-xl leading-[1.5]">
                On-brand. Every post.
              </h3>
              <p className="font-[family-name:var(--font-geist-sans)] text-base md:text-lg text-brand/80 leading-relaxed">
                Upload your logo. Lock your colors and fonts. Every image comes out looking like you made it on purpose.
              </p>
              <BrandKitMockup />
            </div>
          </div>
        </div>
      </section>

      {/* S7: Pricing */}
      <section className="py-16 md:py-24 bg-surface border-b-2 border-brand">
        <div className="mx-auto max-w-6xl px-4 md:px-10">
          <div className="mb-12 md:mb-16 text-center">
            <div className="flex items-center justify-center gap-2.5 mb-5">
              <div className="w-6 h-[3px] bg-gold" />
              <span className="font-[family-name:var(--font-press-start)] text-[8px] text-gold uppercase tracking-wider">
                Pricing
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
                <div key={plan.id} className="border-[3px] border-brand shadow-[6px_6px_0_var(--color-brand)] overflow-hidden flex flex-col">
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
                        {plan.credits.toLocaleString()} images<br />
                        or {(plan.credits / 5).toLocaleString()} videos
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-10 md:mt-14 text-center">
            <CtaLink
              signedOutHref="/signup"
              signedInHref="/admin/billing"
              className="inline-block font-[family-name:var(--font-press-start)] text-[10px] px-6 py-3 border-2 border-brand bg-gold text-brand shadow-[3px_3px_0_var(--color-brand)] hover:shadow-[1px_1px_0_var(--color-brand)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
            >
              Start with 30 Free Credits
            </CtaLink>
            <p className="font-[family-name:var(--font-geist-sans)] text-xs text-brand/50 mt-2">
              No card. Upgrade when you need more.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 md:py-24 bg-white border-b-2 border-brand">
        <div className="mx-auto max-w-6xl px-4 md:px-10">
          <div className="text-center mb-12">
            <span className="font-[family-name:var(--font-press-start)] text-[10px] uppercase tracking-wider text-brand/50 block mb-3">
              The details
            </span>
            <h2 className="font-[family-name:var(--font-press-start)] text-sm md:text-xl leading-[1.5]">
              Frequently asked.
            </h2>
          </div>
          <div className="flex flex-col gap-4">
            {FAQ.map((item, i) => (
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
            Start free. <span className="block md:inline">Upgrade when you&apos;re ready.</span>
          </h2>
          <p className="font-[family-name:var(--font-geist-sans)] text-base md:text-lg text-brand/80 leading-relaxed mb-8 max-w-xl mx-auto">
            30 free credits. No credit card. First render in under a minute.
          </p>
          <CtaLink
            signedOutHref="/signup"
            signedInHref="/admin"
            className="inline-block font-[family-name:var(--font-press-start)] text-xs md:text-sm px-6 py-4 text-brand border-2 border-brand bg-white shadow-[4px_4px_0_var(--color-brand)] hover:shadow-[2px_2px_0_var(--color-brand)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
          >
            Start for free
          </CtaLink>
        </div>
      </section>

      {/* SoftwareApplication JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "brag.fast",
            applicationCategory: "DesignApplication",
            operatingSystem: "Web",
            offers: {
              "@type": "Offer",
              price: "0",
              priceCurrency: "USD",
            },
          }),
        }}
      />

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
              Developers
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
