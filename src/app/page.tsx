import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { LandingNav } from "@/components/landing/landing-nav";
import { BeforeAfter } from "@/components/landing/before-after";
import { HeroSocialStack } from "@/components/landing/social-card";
import { BrandKitMockup } from "@/components/landing/brand-kit-mockup";
import { LazyVideo } from "@/components/landing/lazy-video";
import { SkillCommandMock } from "@/components/landing/skill-command-mock";
import { PAID_PLANS } from "@/lib/plans";

export const metadata: Metadata = {
  title: "brag.fast | Ship features. Post like a pro.",
  description:
    "Turn your releases into branded social images and videos. One API call, AI skill, or GitHub integration. Announce every feature in seconds, not hours.",
  alternates: { canonical: "/" },
};

export default function Home() {
  return (
    <div className="min-h-screen bg-surface text-brand">
      <LandingNav />

      {/* S1: Hero */}
      <section className="pt-16 pb-20 md:pt-24 md:pb-28 bg-white border-b-2 border-brand overflow-hidden">
        <div className="mx-auto max-w-5xl px-4 md:px-8 grid md:grid-cols-2 gap-10 md:gap-16 items-center">
          {/* Left: copy + CTA */}
          <div>
            <h1 className="font-[family-name:var(--font-press-start)] text-xl md:text-3xl leading-relaxed mb-6">
              Ship features. Post like a pro.
            </h1>
            <p className="font-[family-name:var(--font-geist-sans)] text-base md:text-lg text-brand/80 max-w-xl mb-8 leading-relaxed">
              brag.fast turns your releases into branded social images and
              videos. The same polished announcements you see from top
              companies, generated in seconds.
            </p>
            <Link
              href="/signup"
              className="inline-block font-[family-name:var(--font-press-start)] text-xs md:text-sm px-6 py-4 text-brand border-2 border-brand bg-gold shadow-[4px_4px_0_var(--color-brand)] hover:shadow-[2px_2px_0_var(--color-brand)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
            >
              Get 10 Free Credits
            </Link>
            <p className="font-[family-name:var(--font-geist-sans)] text-sm text-brand/50 mt-3">
              No credit card required
            </p>
          </div>

          {/* Right: stacked social cards — X front, LinkedIn middle, Instagram back */}
          <div className="animate-[fade-in-up_0.6s_ease-out_both]">
            <HeroSocialStack />
          </div>
        </div>
      </section>

      {/* S2: Before/After */}
      <section className="py-16 md:py-24 bg-white border-b-2 border-brand">
        <div className="mx-auto max-w-5xl px-4 md:px-8">
          <h2 className="font-[family-name:var(--font-press-start)] text-sm md:text-lg mb-10 text-center">
            Which post is better?
          </h2>
          <BeforeAfter />
        </div>
      </section>

      {/* S3: Cook Demo */}
      <section
        id="kitchen"
        className="scroll-mt-16 py-16 md:py-24 bg-surface border-b-2 border-brand"
      >
        <div className="mx-auto max-w-5xl px-4 md:px-8">
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
            <div className="flex flex-col gap-4">
              <span className="font-[family-name:var(--font-press-start)] text-[10px] uppercase tracking-wider text-brand/50 block">
                The Kitchen
              </span>
              <h2 className="font-[family-name:var(--font-press-start)] text-sm md:text-lg">
                Cook it yourself. In seconds.
              </h2>
              <p className="font-[family-name:var(--font-geist-sans)] text-base md:text-lg text-brand/80 leading-relaxed">
                Drop in your screenshots, pick a template, hit Cook. Branded images for every format — ready to post.
              </p>
              <Link
                href="/signup"
                className="inline-block self-start font-[family-name:var(--font-press-start)] text-[10px] px-4 py-3 text-brand border-2 border-brand bg-gold shadow-[3px_3px_0_var(--color-brand)] hover:shadow-[1px_1px_0_var(--color-brand)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
              >
                Start Cooking
              </Link>
            </div>
            <div className="border-2 border-brand bg-white p-4 md:p-6 shadow-[4px_4px_0_var(--color-brand)]">
              <LazyVideo
                src="/demo/bragfast_cook_demo.mp4"
                className="w-full rounded-sm border border-brand"
              />
            </div>
          </div>
        </div>
      </section>

      {/* S4: Automate It — AI + GitHub */}
      <section
        id="ai"
        className="scroll-mt-16 py-16 md:py-24 bg-white border-b-2 border-brand"
      >
        <div className="mx-auto max-w-5xl px-4 md:px-8">
          <span className="font-[family-name:var(--font-press-start)] text-[10px] uppercase tracking-wider text-brand/50 mb-3 block">
            Automate it
          </span>
          <h2 className="font-[family-name:var(--font-press-start)] text-sm md:text-lg mb-4">
            Set it and forget it
          </h2>
          <p className="font-[family-name:var(--font-geist-sans)] text-base md:text-lg text-brand/80 leading-relaxed mb-10 max-w-2xl">
            Tell your AI to generate images with a single command. Or connect
            GitHub and every release gets branded images automatically.
          </p>

          <div className="grid md:grid-cols-2 gap-8 md:gap-12">
            {/* AI card */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-[3px] bg-gold" />
                <span className="font-[family-name:var(--font-press-start)] text-[8px] text-gold uppercase tracking-wider">
                  AI / MCP
                </span>
              </div>
              <SkillCommandMock />
              <a
                href="https://github.com/rob-vb/bragfast-skills"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block self-start font-[family-name:var(--font-press-start)] text-[10px] px-4 py-3 text-brand border-2 border-brand bg-gold shadow-[3px_3px_0_var(--color-brand)] hover:shadow-[1px_1px_0_var(--color-brand)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
              >
                Get the Skill
              </a>
            </div>

            {/* GitHub card */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-[3px] bg-gold" />
                <span className="font-[family-name:var(--font-press-start)] text-[8px] text-gold uppercase tracking-wider">
                  GitHub
                </span>
              </div>
              <div className="border-2 border-brand bg-white p-6 shadow-[4px_4px_0_var(--color-brand)]">
                <LazyVideo
                  src="/demo/github_release_demo_compressed.mp4"
                  className="w-full rounded-sm border border-brand"
                />
              </div>
              <Link
                href="/dashboard/account"
                className="inline-block self-start font-[family-name:var(--font-press-start)] text-[10px] px-4 py-3 text-brand border-2 border-brand bg-gold shadow-[3px_3px_0_var(--color-brand)] hover:shadow-[1px_1px_0_var(--color-brand)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
              >
                Connect GitHub
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* S5: Build With It — API */}
      <section
        id="api"
        className="scroll-mt-16 py-16 md:py-24 bg-surface border-b-2 border-brand"
      >
        <div className="mx-auto max-w-5xl px-4 md:px-8 grid md:grid-cols-2 gap-8 md:gap-12 items-center">
          <div>
            <span className="font-[family-name:var(--font-press-start)] text-[10px] uppercase tracking-wider text-brand/50 mb-3 block">
              Full control
            </span>
            <h2 className="font-[family-name:var(--font-press-start)] text-sm md:text-lg mb-4">
              One API call. Polished visuals back.
            </h2>
            <p className="font-[family-name:var(--font-geist-sans)] text-base md:text-lg text-brand/80 leading-relaxed mb-6">
              POST your release details, get branded images and videos in
              multiple formats. Build it into your CI/CD, your bot, your
              workflow.
            </p>
            <Link
              href="/docs"
              className="inline-block font-[family-name:var(--font-press-start)] text-[10px] px-4 py-3 text-brand border-2 border-brand bg-gold shadow-[3px_3px_0_var(--color-brand)] hover:shadow-[1px_1px_0_var(--color-brand)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
            >
              Read the Docs
            </Link>
          </div>
          <div className="border-2 border-brand bg-brand shadow-[4px_4px_0_var(--color-brand)] min-w-0">
            <div className="border-b-2 border-surface/20 px-3 py-1.5 flex items-center gap-1.5">
              <span className="block h-2 w-2 border border-surface/30 bg-gold" />
              <span className="block h-2 w-2 border border-surface/30 bg-surface/20" />
              <span className="block h-2 w-2 border border-surface/30 bg-surface/20" />
            </div>
            <pre className="p-4 overflow-x-hidden whitespace-pre-wrap break-words">
              <code className="font-[family-name:var(--font-geist-mono)] text-[10px] md:text-sm text-surface/90 leading-relaxed">
{`curl -X POST \\
  brag.fast/api/v1/cook \\
  -H "Authorization: Bearer bf_key" \\
  -d '{
    "template": "standard-browser",
    "formats": [{
      "name": "landscape",
      "slides": [{
        "objects": [
          { "id": "title",
            "text": "Dark mode is here" },
          { "id": "image",
            "image_url": "https://..." }
        ]
      }]
    }]
  }'`}
              </code>
            </pre>
            <div className="flex items-center gap-2 px-4 pb-3 pt-1">
              <span className="font-[family-name:var(--font-geist-mono)] text-[8px] text-surface/40">
                Output:
              </span>
              {["16:9", "1:1", "4:5"].map((fmt) => (
                <span
                  key={fmt}
                  className="font-[family-name:var(--font-press-start)] text-[6px] text-surface/60 border border-surface/20 px-1.5 py-0.5"
                >
                  {fmt}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* S6: Features — Template Editor + Brand Kits */}
      <section className="py-16 md:py-24 bg-white border-b-2 border-brand">
        <div className="mx-auto max-w-5xl px-4 md:px-8">
          <div className="grid md:grid-cols-2 gap-12 md:gap-16">
            {/* Template Editor */}
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-[3px] bg-gold" />
                <span className="font-[family-name:var(--font-press-start)] text-[8px] text-gold uppercase tracking-wider">
                  Templates
                </span>
              </div>
              <h3 className="font-[family-name:var(--font-press-start)] text-sm md:text-lg">
                Design your own recipe
              </h3>
              <p className="font-[family-name:var(--font-geist-sans)] text-base md:text-lg text-brand/80 leading-relaxed">
                No design skills needed. Drag objects, set colors, preview live.
                Every render uses your recipe automatically.
              </p>
              <div className="border-2 border-brand bg-white p-6 shadow-[4px_4px_0_var(--color-brand)]">
                <LazyVideo
                  src="/demo/template_editor_compressed.mp4"
                  className="w-full rounded-sm border border-brand"
                />
              </div>
            </div>

            {/* Brand Kits */}
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-[3px] bg-gold" />
                <span className="font-[family-name:var(--font-press-start)] text-[8px] text-gold uppercase tracking-wider">
                  Branding
                </span>
              </div>
              <h3 className="font-[family-name:var(--font-press-start)] text-sm md:text-lg">
                On-brand, every time
              </h3>
              <p className="font-[family-name:var(--font-geist-sans)] text-base md:text-lg text-brand/80 leading-relaxed">
                Upload your logo, set your colors and fonts. Every image comes
                out on-brand, every time.
              </p>
              <BrandKitMockup />
            </div>
          </div>
        </div>
      </section>

      {/* S8: Pricing — Retro Menu Board */}
      <section className="py-16 md:py-20 bg-surface border-y-2 border-brand">
        <div className="mx-auto max-w-2xl px-4 md:px-8">
          <div className="border-[3px] border-brand shadow-[6px_6px_0_var(--color-brand)] overflow-hidden">
            <div className="bg-brand text-gold px-5 py-4 text-center">
              <h2 className="font-[family-name:var(--font-press-start)] text-sm md:text-base">
                brag.fast menu
              </h2>
              <p className="font-[family-name:var(--font-geist-sans)] text-xs text-surface/60 mt-1">
                Images: 1 credit/slide. Videos: 10 credits/slide.
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
                    <div className="flex items-center gap-2">
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
                Start with 10 Free Credits
              </Link>
              <p className="font-[family-name:var(--font-geist-sans)] text-xs text-brand/50 mt-2">
                No credit card required
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* S9: Final CTA */}
      <section className="py-16 md:py-24 bg-gold border-y-2 border-brand">
        <div className="mx-auto max-w-5xl px-4 md:px-8 text-center">
          <h2 className="font-[family-name:var(--font-press-start)] text-lg md:text-2xl mb-4">
            Start showing off. Like a pro.
          </h2>
          <p className="font-[family-name:var(--font-geist-sans)] text-base md:text-lg text-brand/80 leading-relaxed mb-8">
            10 free credits. No credit card. See results in seconds.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup"
              className="inline-block font-[family-name:var(--font-press-start)] text-xs md:text-sm px-6 py-4 text-brand border-2 border-brand bg-white shadow-[4px_4px_0_var(--color-brand)] hover:shadow-[2px_2px_0_var(--color-brand)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
            >
              Get 10 Free Credits
            </Link>
          </div>
          <p className="font-[family-name:var(--font-geist-sans)] text-sm text-brand/60 mt-4">
            No credit card required
          </p>
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

      {/* S10: Footer */}
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
          <div className="flex items-center gap-4">
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
