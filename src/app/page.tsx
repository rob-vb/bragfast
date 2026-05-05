import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { LandingNav } from "@/components/landing/landing-nav";
import { BeforeAfter } from "@/components/landing/before-after";
import { HeroSocialStack } from "@/components/landing/social-card";
import { BrandKitMockup } from "@/components/landing/brand-kit-mockup";
import { LazyVideo } from "@/components/landing/lazy-video";
import { CtaLink } from "@/components/landing/cta-link";
import { NEW_TIERS, FEATURES } from "@/lib/pricing-data";
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
    a: "You connect the integrations you want: GitHub for merges and stars, Stripe for revenue milestones, PostHog for analytics, and more. Sous-Chef both reacts in real time (a PR merges, a milestone hits) and sweeps on a schedule, drafting a post the moment it spots a win and leaving it for you to cook. You approve every post. Disconnect any integration any time.",
  },
];

const SOUS_CHEF_FLOW = [
  {
    title: "Connect",
    copy: "Link GitHub and your tools in read-only mode.",
  },
  {
    title: "Watch",
    copy: "Sous-Chef tracks merges, releases, and milestones.",
  },
  {
    title: "Draft",
    copy: "It creates a branded draft with title + visual.",
  },
  {
    title: "Review",
    copy: "You polish the message and approve the final post.",
  },
  {
    title: "Share",
    copy: "Publish or schedule everywhere from one workflow.",
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
              You build apps. Nobody notices.
            </h1>
            <p className="font-[family-name:var(--font-geist-sans)] text-base md:text-lg text-brand/80 max-w-xl mb-8 leading-relaxed">
              Your work deserves an audience. Your sous-chef agent turns every commit, release, and milestone into share-ready images and videos, automatically.
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
                Sous-Chef watches your connected integrations. When a PR merges, a milestone hits, or stars jump, it drafts a post with your brand, waiting for you to approve and cook.
              </p>
              <div className="flex flex-col gap-3 mt-2">
                <span className="font-[family-name:var(--font-press-start)] text-[8px] text-brand/60 uppercase tracking-wider">
                  Plugs into
                </span>
                <div className="flex items-center gap-3">
                  {[
                    {
                      name: "GitHub",
                      path: "M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12",
                    },
                    {
                      name: "Stripe",
                      path: "M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.594-7.305h.003z",
                    },
                    {
                      name: "PostHog",
                      path: "M9.197 5.564a1.06 1.06 0 0 0-1.81-.748L.31 11.892a1.06 1.06 0 0 0 0 1.498l7.077 7.076a1.06 1.06 0 0 0 1.81-.748v-3.297l3.13 3.13a1.06 1.06 0 0 0 1.81-.749v-3.55l3.13 3.13a1.06 1.06 0 0 0 1.81-.749V5.565a1.06 1.06 0 0 0-1.06-1.061h-8.82zM2.554 14.764a.53.53 0 0 1 0-.75l.84-.84a.53.53 0 0 1 .75 0l3.39 3.39a.53.53 0 0 1-.375.905H4.534a.53.53 0 0 1-.375-.156l-1.605-1.604zm5.643-5.643a.53.53 0 0 1 .905.375v6.625l-3.92-3.92a.53.53 0 0 1 0-.75l3.015-3.015zm5.81 0a.53.53 0 0 1 .905.375v6.625l-3.92-3.92a.53.53 0 0 1 0-.75L13.84 9.12h.166z",
                    },
                    {
                      name: "Google Analytics",
                      path: "M22.84 2.998v17.999a2.983 2.983 0 0 1-2.967 2.998 2.98 2.98 0 0 1-2.965-2.998V3.193C16.908 1.561 18.245.103 19.876.003a2.984 2.984 0 0 1 2.964 2.995zM4.133 18.03a2.97 2.97 0 1 0 0 5.94 2.97 2.97 0 0 0 0-5.94zm7.872-9.012a2.987 2.987 0 0 0-2.964 3.097v8.014c0 2.085.92 3.349 2.265 3.617 1.55.31 3.025-.87 3.661-2.21.217-.453.298-.905.298-1.42v-8.046c0-1.658-1.34-2.991-2.998-2.991z",
                    },
                  ].map((logo) => (
                    <div
                      key={logo.name}
                      className="group relative w-12 h-12 flex items-center justify-center border-2 border-brand bg-cream shadow-[3px_3px_0_var(--color-brand)]"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className="w-6 h-6 fill-brand"
                        aria-label={logo.name}
                        role="img"
                      >
                        <path d={logo.path} />
                      </svg>
                      <span
                        role="tooltip"
                        className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full whitespace-nowrap font-[family-name:var(--font-press-start)] text-[8px] uppercase tracking-wider px-2 py-1.5 border-2 border-brand bg-white text-brand shadow-[2px_2px_0_var(--color-brand)] opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        {logo.name}
                      </span>
                    </div>
                  ))}
                </div>
                {/* <CtaLink
                  signedOutHref="/signup"
                  signedInHref="/admin/sous-chef"
                  className="font-[family-name:var(--font-geist-sans)] text-sm text-brand underline underline-offset-4 self-start hover:text-gold transition-colors"
                >
                  Connect an integration &#9656;
                </CtaLink> */}
              </div>
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
      <section className="py-16 md:py-24 bg-white border-b-2 border-brand">
        <div className="mx-auto max-w-6xl px-4 md:px-10">
          <div className="flex flex-col gap-5 mb-8 md:mb-10">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-[3px] bg-gold" />
              <span className="font-[family-name:var(--font-press-start)] text-[8px] text-gold uppercase tracking-wider">
                How it works
              </span>
            </div>
            <h2 className="font-[family-name:var(--font-press-start)] text-base md:text-2xl leading-[1.4]">
              From merged PR to ready-to-share post.
            </h2>
            <p className="font-[family-name:var(--font-geist-sans)] text-base md:text-lg text-brand/80 leading-relaxed max-w-3xl">
              A simple workflow: connect your sources, let Sous-Chef detect wins, then review and publish. The pulse below shows how each win moves through your pipeline.
            </p>
          </div>

          <div className="relative border-2 border-brand bg-surface p-4 md:p-6 shadow-[6px_6px_0_var(--color-brand)]">
            <div aria-hidden className="absolute left-[6%] right-[6%] md:left-[9%] md:right-[9%] top-10 md:top-12 h-[3px] bg-brand/25" />
            <div
              aria-hidden
              className="absolute top-8 md:top-10 h-5 w-5 rounded-full border-2 border-brand bg-gold shadow-[2px_2px_0_var(--color-brand)] how-it-works-dot"
            />

            <ol className="relative grid gap-4 md:grid-cols-5 md:gap-3">
              {SOUS_CHEF_FLOW.map((step, index) => (
                <li key={step.title} className="border-2 border-brand bg-white px-3 py-4 md:px-2">
                  <div className="mb-2 inline-flex items-center justify-center w-6 h-6 border-2 border-brand bg-gold font-[family-name:var(--font-press-start)] text-[9px] leading-none">
                    {index + 1}
                  </div>
                  <h3 className="font-[family-name:var(--font-press-start)] text-[10px] uppercase leading-[1.5] mb-1.5">
                    {step.title}
                  </h3>
                  <p className="font-[family-name:var(--font-geist-sans)] text-sm text-brand/80 leading-snug">
                    {step.copy}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

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
                Add content, upload a screenshot or screen recording, pick a template, and you&apos;ve got landscape, square, and portrait versions ready to post. Takes about a minute.
              </p>
              {/* <div className="flex flex-wrap gap-2 pt-1">
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
              </div> */}
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
              One post = one approval. Tier bounds the rest.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {NEW_TIERS.map((tier) => {
              const isPopular = tier.id === "plate";
              const postsValue = FEATURES[0][tier.id] as string;
              return (
                <div key={tier.id} className="border-[3px] border-brand shadow-[6px_6px_0_var(--color-brand)] overflow-hidden flex flex-col">
                  <div className="bg-brand px-5 py-4 flex items-center justify-between min-h-[56px]">
                    <span className="font-[family-name:var(--font-press-start)] text-[10px] text-gold">
                      &#9656; {tier.name}
                    </span>
                    {isPopular && (
                      <span className="font-[family-name:var(--font-press-start)] text-[7px] bg-gold text-brand px-2 py-1 border border-gold/60">
                        POPULAR
                      </span>
                    )}
                  </div>
                  <div className="bg-white p-5 flex flex-col gap-5 flex-1">
                    <p className="font-[family-name:var(--font-geist-sans)] text-sm text-brand/60">
                      {tier.label}
                    </p>
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="font-[family-name:var(--font-press-start)] text-3xl">
                          ${tier.price}
                        </span>
                        <span className="font-[family-name:var(--font-geist-sans)] text-sm text-brand/50">
                          /mo
                        </span>
                      </div>
                      <p className="font-[family-name:var(--font-press-start)] text-[9px] text-brand/50 mt-1.5">
                        {postsValue} credits/month
                      </p>
                    </div>
                    <div className="border-t-2 border-brand/10 pt-4">
                      <p className="font-[family-name:var(--font-geist-sans)] text-sm text-brand/70 leading-relaxed">
                        {tier.blurb}
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
