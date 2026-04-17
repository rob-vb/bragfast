import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { LandingNav } from "@/components/landing/landing-nav";
import { BeforeAfter } from "@/components/landing/before-after";
import { HeroSocialStack } from "@/components/landing/social-card";
import { BrandKitMockup } from "@/components/landing/brand-kit-mockup";
import { LazyVideo } from "@/components/landing/lazy-video";
import { McpInstallInstructions } from "@/components/landing/mcp-install-instructions";
import { PAID_PLANS } from "@/lib/plans";

export const metadata: Metadata = {
  title: "brag.fast | Cook branded release visuals in seconds",
  description:
    "Drop screenshots. Hit Cook. Post. brag.fast turns your software releases into branded social images and videos. Landscape, square, portrait. Or ask Claude to do it for you.",
  alternates: { canonical: "/" },
};

const FAQ = [
  {
    q: "Can't I just use Canva?",
    a: "You can. Will you? Every release? brag.fast runs in under a minute. Or runs itself. Canva doesn't.",
  },
  {
    q: "Will it match my brand?",
    a: "Upload your logo. Set colors and fonts. Every image out the door looks like you made it on purpose.",
  },
  {
    q: "I don't ship that often.",
    a: "Start free. 30 credits, no card. If you ship monthly, Toast covers you for $12.",
  },
  {
    q: "Is video going to eat all my credits?",
    a: "5 credits per video per format. A landscape video = 5 credits. All three formats = 15. Toast gives you 200 a month.",
  },
  {
    q: "What if the AI picks the wrong highlights?",
    a: "Edit before cook. Or skip the AI and type the copy yourself. Your kitchen, your call.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-surface text-brand">
      <LandingNav />

      {/* S1: Hero */}
      <section className="relative pt-16 pb-20 md:pt-24 md:pb-28 bg-white border-b-2 border-brand overflow-hidden">
        {/* Decorative pixel grid */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(var(--color-brand) 1px, transparent 1px), linear-gradient(90deg, var(--color-brand) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        <div className="relative mx-auto max-w-5xl px-4 md:px-8 grid md:grid-cols-[1.1fr_1fr] gap-10 md:gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 border-2 border-brand bg-gold/20 px-2.5 py-1 mb-5">
              <span className="w-1.5 h-1.5 bg-gold animate-pulse" />
              <span className="font-[family-name:var(--font-press-start)] text-[8px] uppercase tracking-wider">
                Now serving · v2.1
              </span>
            </div>
            <h1 className="font-[family-name:var(--font-press-start)] text-2xl md:text-4xl leading-[1.4] mb-6">
              Cook branded release visuals <span className="text-gold">in seconds.</span>
            </h1>
            <p className="font-[family-name:var(--font-geist-sans)] text-base md:text-lg text-brand/80 max-w-xl mb-8 leading-relaxed">
              Open the Cook page, drop your screenshots, pick a template. Branded
              images and video come out in landscape, square, and portrait.
              Or install the MCP and ask Claude to do it for you.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center font-[family-name:var(--font-press-start)] text-xs md:text-sm px-6 py-4 text-brand border-2 border-brand bg-gold shadow-[4px_4px_0_var(--color-brand)] hover:shadow-[2px_2px_0_var(--color-brand)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
              >
                Start Cooking · 30 Free Credits
              </Link>
              <Link
                href="#mcp"
                className="inline-flex items-center justify-center font-[family-name:var(--font-press-start)] text-[10px] md:text-xs px-5 py-4 text-brand border-2 border-brand bg-white shadow-[3px_3px_0_var(--color-brand)] hover:shadow-[1px_1px_0_var(--color-brand)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
              >
                Install MCP ↓
              </Link>
            </div>
            <p className="font-[family-name:var(--font-geist-sans)] text-sm text-brand/50 mt-4">
              No credit card. Ready in under a minute.
            </p>
          </div>

          <div className="animate-[fade-in-up_0.6s_ease-out_both]">
            <HeroSocialStack />
          </div>
        </div>
      </section>

      {/* S2: Cook Demo */}
      <section
        id="kitchen"
        className="scroll-mt-16 py-16 md:py-24 bg-surface border-b-2 border-brand"
      >
        <div className="mx-auto max-w-5xl px-4 md:px-8">
          <div className="grid md:grid-cols-[0.9fr_1.1fr] gap-10 md:gap-14 items-center">
            <div className="flex flex-col gap-5">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-[3px] bg-gold" />
                <span className="font-[family-name:var(--font-press-start)] text-[8px] text-gold uppercase tracking-wider">
                  The Kitchen
                </span>
              </div>
              <h2 className="font-[family-name:var(--font-press-start)] text-base md:text-2xl leading-[1.4]">
                Drop it in.<br />Cook it.<br />Serve it.
              </h2>
              <p className="font-[family-name:var(--font-geist-sans)] text-base md:text-lg text-brand/80 leading-relaxed max-w-md">
                Drop in screenshots or a screen recording. Pick a template and
                brand. Hit Cook. Branded images <em>and</em> video come out in
                every format you need. Landscape, square, portrait. No design
                tool. No editor. No learning curve.
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
              <Link
                href="/signup"
                className="inline-block self-start font-[family-name:var(--font-press-start)] text-[10px] px-4 py-3 mt-2 text-brand border-2 border-brand bg-gold shadow-[3px_3px_0_var(--color-brand)] hover:shadow-[1px_1px_0_var(--color-brand)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
              >
                Cook Your First Release
              </Link>
            </div>
            <div className="border-2 border-brand bg-white p-3 md:p-4 shadow-[6px_6px_0_var(--color-brand)]">
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

      {/* S3: Three Ways to Cook */}
      <section className="py-16 md:py-24 bg-white border-b-2 border-brand">
        <div className="mx-auto max-w-5xl px-4 md:px-8">
          <div className="flex flex-col items-center text-center mb-10 md:mb-14 gap-3">
            <span className="font-[family-name:var(--font-press-start)] text-[10px] uppercase tracking-wider text-brand/50">
              Order however you want
            </span>
            <h2 className="font-[family-name:var(--font-press-start)] text-base md:text-2xl leading-[1.4]">
              Three ways to get on the menu.
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6 md:gap-8">
            {/* Cook page */}
            <div className="border-2 border-brand bg-white p-6 md:p-7 shadow-[4px_4px_0_var(--color-brand)] flex flex-col">
              <div className="mb-4">
                <span className="font-[family-name:var(--font-press-start)] text-[9px] uppercase tracking-wider text-brand/60">
                  Cook page
                </span>
              </div>
              <h3 className="font-[family-name:var(--font-press-start)] text-sm md:text-base mb-3 leading-[1.5]">
                Open it. Drop. Hit Cook.
              </h3>
              <p className="font-[family-name:var(--font-geist-sans)] text-sm text-brand/70 leading-relaxed mb-6 flex-1">
                Drop screenshots or screen recordings. Pick a template. Branded images and video out in under a minute.
              </p>
              <Link
                href="/signup"
                className="inline-block self-start font-[family-name:var(--font-press-start)] text-[10px] px-4 py-3 text-brand border-2 border-brand bg-white shadow-[3px_3px_0_var(--color-brand)] hover:shadow-[1px_1px_0_var(--color-brand)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all whitespace-nowrap"
              >
                Start Cooking →
              </Link>
            </div>

            {/* MCP */}
            <div className="border-2 border-brand bg-white p-6 md:p-7 shadow-[4px_4px_0_var(--color-brand)] flex flex-col">
              <div className="mb-4">
                <span className="font-[family-name:var(--font-press-start)] text-[9px] uppercase tracking-wider text-brand/60">
                  MCP
                </span>
              </div>
              <h3 className="font-[family-name:var(--font-press-start)] text-sm md:text-base mb-3 leading-[1.5]">
                Already in Claude? Just ask.
              </h3>
              <p className="font-[family-name:var(--font-geist-sans)] text-sm text-brand/70 leading-relaxed mb-3">
                Works in Claude Desktop and Claude Code.
              </p>
              <code className="block font-[family-name:var(--font-geist-mono)] text-[11px] text-brand bg-gold/30 border border-brand/30 px-2 py-1.5 select-all break-all mb-6">
                https://mcp.brag.fast/mcp
              </code>
              <Link
                href="#mcp"
                className="inline-block self-start mt-auto font-[family-name:var(--font-press-start)] text-[10px] px-4 py-3 text-brand border-2 border-brand bg-white shadow-[3px_3px_0_var(--color-brand)] hover:shadow-[1px_1px_0_var(--color-brand)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all whitespace-nowrap"
              >
                Install MCP →
              </Link>
            </div>

            {/* REST API */}
            <div className="border-2 border-brand bg-white p-6 md:p-7 shadow-[4px_4px_0_var(--color-brand)] flex flex-col">
              <div className="mb-4">
                <span className="font-[family-name:var(--font-press-start)] text-[9px] uppercase tracking-wider text-brand/60">
                  REST API
                </span>
              </div>
              <h3 className="font-[family-name:var(--font-press-start)] text-sm md:text-base mb-3 leading-[1.5]">
                Wire it into CI/CD.
              </h3>
              <p className="font-[family-name:var(--font-geist-sans)] text-sm text-brand/70 leading-relaxed mb-3">
                POST your release, get branded visuals back.
              </p>
              <code className="block font-[family-name:var(--font-geist-mono)] text-[11px] text-surface bg-brand px-2 py-1.5 break-all mb-6">
                POST /api/v1/cook/image
              </code>
              <Link
                href="/docs"
                className="inline-block self-start mt-auto font-[family-name:var(--font-press-start)] text-[10px] px-4 py-3 text-brand border-2 border-brand bg-white shadow-[3px_3px_0_var(--color-brand)] hover:shadow-[1px_1px_0_var(--color-brand)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all whitespace-nowrap"
              >
                Read the docs →
              </Link>
            </div>
          </div>

        </div>
      </section>

      {/* S4: MCP anchor */}
      <section
        id="mcp"
        className="scroll-mt-16 py-16 md:py-20 bg-surface border-b-2 border-brand"
      >
        <div className="mx-auto max-w-2xl px-4 md:px-8 flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-[3px] bg-gold" />
              <span className="font-[family-name:var(--font-press-start)] text-[8px] text-gold uppercase tracking-wider">
                MCP Setup
              </span>
            </div>
            <h2 className="font-[family-name:var(--font-press-start)] text-sm md:text-xl leading-[1.4]">
              One command. Then just ask Claude.
            </h2>
            <p className="font-[family-name:var(--font-geist-sans)] text-base md:text-lg text-brand/80 leading-relaxed">
              Works in Claude Desktop and Claude Code. Pick your client and
              paste.
            </p>
          </div>
          <McpInstallInstructions />
        </div>
      </section>

      {/* S5: Before/After */}
      <section className="py-16 md:py-24 bg-white border-b-2 border-brand">
        <div className="mx-auto max-w-5xl px-4 md:px-8">
          <div className="text-center mb-10">
            <h2 className="font-[family-name:var(--font-press-start)] text-sm md:text-xl leading-[1.5] mb-3">
              Which post would you click?
            </h2>
            <p className="font-[family-name:var(--font-geist-sans)] text-base text-brand/60 max-w-xl mx-auto">
              Left: simple text post. Right: branded visual that makes people
              stop scrolling.
            </p>
          </div>
          <BeforeAfter />
        </div>
      </section>

      {/* S6: Templates + Brand Kits */}
      <section className="py-16 md:py-24 bg-surface border-b-2 border-brand">
        <div className="mx-auto max-w-5xl px-4 md:px-8">
          <div className="grid md:grid-cols-2 gap-12 md:gap-16">
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-[3px] bg-gold" />
                <span className="font-[family-name:var(--font-press-start)] text-[8px] text-gold uppercase tracking-wider">
                  Templates
                </span>
              </div>
              <h3 className="font-[family-name:var(--font-press-start)] text-sm md:text-xl leading-[1.5]">
                Design your own recipe.
              </h3>
              <p className="font-[family-name:var(--font-geist-sans)] text-base md:text-lg text-brand/80 leading-relaxed">
                Drag objects. Set colors. Preview live. Every render uses your
                recipe. No babysitting.
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
                On-brand. Every plate.
              </h3>
              <p className="font-[family-name:var(--font-geist-sans)] text-base md:text-lg text-brand/80 leading-relaxed">
                Upload your logo. Lock your colors and fonts. Every image comes
                out looking like you made it on purpose.
              </p>
              <BrandKitMockup />
            </div>
          </div>
        </div>
      </section>

      {/* S7: Pricing */}
      <section className="py-16 md:py-20 bg-surface border-b-2 border-brand">
        <div className="mx-auto max-w-2xl px-4 md:px-8">
          <div className="border-[3px] border-brand shadow-[6px_6px_0_var(--color-brand)] overflow-hidden">
            <div className="bg-brand text-gold px-5 py-4 text-center">
              <h2 className="font-[family-name:var(--font-press-start)] text-sm md:text-base">
                brag.fast menu
              </h2>
              <p className="font-[family-name:var(--font-geist-sans)] text-xs text-surface/60 mt-1">
                Images: 1 credit each. Videos: 5 credits each.
              </p>
            </div>

            {/* Signup bonus strip. One-time gift, not a plan. */}
            <div className="bg-gold/20 px-5 py-3 flex items-center gap-3 border-b-2 border-brand/10">
              <span className="font-[family-name:var(--font-press-start)] text-[8px] bg-gold text-brand px-1.5 py-0.5 border border-brand shrink-0">
                Sign-up bonus
              </span>
              <p className="font-[family-name:var(--font-geist-sans)] text-xs text-brand/70 leading-snug">
                Every new account gets <strong>30 free credits</strong> to try
                the kitchen. No card, one-time.
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
                      {plan.label} &middot; {plan.credits.toLocaleString()}{" "}
                      credits/mo
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
                No card. Upgrade when you outgrow the free plate.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* S9: FAQ */}
      <section className="py-16 md:py-24 bg-white border-b-2 border-brand">
        <div className="mx-auto max-w-3xl px-4 md:px-8">
          <div className="text-center mb-12">
            <span className="font-[family-name:var(--font-press-start)] text-[10px] uppercase tracking-wider text-brand/50 block mb-3">
              Before you sit down
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

      {/* S10: Final CTA */}
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
            Stop shipping features <span className="block md:inline">in silence.</span>
          </h2>
          <p className="font-[family-name:var(--font-geist-sans)] text-base md:text-lg text-brand/80 leading-relaxed mb-8 max-w-xl mx-auto">
            30 free credits. No credit card. First render in under a minute.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup"
              className="inline-block font-[family-name:var(--font-press-start)] text-xs md:text-sm px-6 py-4 text-brand border-2 border-brand bg-white shadow-[4px_4px_0_var(--color-brand)] hover:shadow-[2px_2px_0_var(--color-brand)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
            >
              Start Cooking · Free
            </Link>
            <Link
              href="#mcp"
              className="inline-block font-[family-name:var(--font-press-start)] text-[10px] md:text-xs px-5 py-4 text-brand border-2 border-brand bg-transparent shadow-[3px_3px_0_var(--color-brand)] hover:bg-brand hover:text-gold hover:shadow-[1px_1px_0_var(--color-brand)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
            >
              Install MCP
            </Link>
          </div>
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
