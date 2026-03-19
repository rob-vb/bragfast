import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { LandingNav } from "@/components/landing/landing-nav";
import { HeroAnimation } from "@/components/landing/hero-animation";
import { BrandKitMockup } from "@/components/landing/brand-kit-mockup";
import { LazyVideo } from "@/components/landing/lazy-video";
import { PAID_PLANS } from "@/lib/plans";

export const metadata: Metadata = {
  title: "brag.fast — Auto-generate social images for your launches",
  description:
    "Generate branded social media images from your releases. One API call or GitHub integration — landscape, square, and portrait formats in seconds.",
};

export default function Home() {
  return (
    <div className="min-h-screen bg-surface text-brand">
      <LandingNav />

      {/* S1: Hero — Split layout */}
      <section className="pt-16 pb-20 md:pt-24 md:pb-28 bg-white border-b-2 border-brand">
        <div className="mx-auto max-w-5xl px-4 md:px-8 grid md:grid-cols-2 gap-10 md:gap-16 items-center">
          {/* Left: text */}
          <div>
            <h1 className="font-[family-name:var(--font-press-start)] text-xl md:text-3xl leading-relaxed mb-6">
              Show what you&apos;ve been cooking
            </h1>
            <p className="font-[family-name:var(--font-geist-sans)] text-base md:text-lg text-brand/80 max-w-xl mb-8 leading-relaxed">
              brag.fast auto-generates (branded) images. Landscape, square, and portrait, so you can post them to your socials immediately.
              Feed your audience.
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

          {/* Right: animated API demo */}
          <HeroAnimation />
        </div>
      </section>

      {/* S2: How it works — Developer + No-Code */}
      <section
        id="features"
        className="scroll-mt-16 py-16 md:py-24"
      >
        <div className="mx-auto max-w-5xl px-4 md:px-8 space-y-16 md:space-y-24">

          {/* Row 1: Developers — text left, code right */}
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
            <div>
              <h2 className="font-[family-name:var(--font-press-start)] text-sm md:text-lg mb-4">
                Developers, POST and receive
              </h2>
              <p className="font-[family-name:var(--font-geist-sans)] text-base md:text-lg text-brand/80 leading-relaxed mb-6">
                Set up an API call and get polished release images back, ready to post. Multiple formats, multiple templates, zero design tools.
              </p>
              <Link
                href="/docs"
                className="inline-block font-[family-name:var(--font-press-start)] text-[10px] px-4 py-3 text-brand border-2 border-brand bg-gold shadow-[3px_3px_0_var(--color-brand)] hover:shadow-[1px_1px_0_var(--color-brand)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
              >
                Read the Docs
              </Link>
            </div>
            <div className="border-2 border-brand bg-brand shadow-[4px_4px_0_var(--color-brand)]">
              <div className="border-b-2 border-surface/20 px-3 py-1.5 flex items-center gap-1.5">
                <span className="block h-2 w-2 border border-surface/30 bg-gold" />
                <span className="block h-2 w-2 border border-surface/30 bg-surface/20" />
                <span className="block h-2 w-2 border border-surface/30 bg-surface/20" />
              </div>
              <pre className="p-4 overflow-x-auto">
                <code className="font-[family-name:var(--font-geist-mono)] text-xs md:text-sm text-surface/90 leading-relaxed">
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

          {/* Row 2: Template Editor — visual left, text right */}
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
            <div className="order-2 md:order-1">
              <div className="border-2 border-brand bg-white p-6 shadow-[4px_4px_0_var(--color-brand)]">
                <LazyVideo
                  src="/demo/template_editor_compressed.mp4"
                  className="w-full rounded-sm border border-brand"
                />
              </div>
            </div>
            <div className="order-1 md:order-2">
              <h2 className="font-[family-name:var(--font-press-start)] text-sm md:text-lg mb-4">
                Cook up your own templates
              </h2>
              <p className="font-[family-name:var(--font-geist-sans)] text-base md:text-lg text-brand/80 leading-relaxed">
                No design skills needed. Drag objects, set colors, preview live. Every render uses your recipe automatically.
              </p>
            </div>
          </div>

          {/* Row 3: GitHub Integration — text left, visual right */}
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
            <div>
              <h2 className="font-[family-name:var(--font-press-start)] text-sm md:text-lg mb-4">
                Ship a release, we plate it
              </h2>
              <p className="font-[family-name:var(--font-geist-sans)] text-base md:text-lg text-brand/80 leading-relaxed mb-6">
                Connect our GitHub App to your repos. Every time you tag a release, AI reads your changelog and generates branded images — approve them yourself or let it run hands-free.
              </p>

            </div>
            <div>
              {/* Demo video */}
              <div className="border-2 border-brand bg-white p-6 shadow-[4px_4px_0_var(--color-brand)]">
                <LazyVideo
                  src="/demo/github_release_demo_compressed.mp4"
                  className="w-full rounded-sm border border-brand"
                />
              </div>
            </div>
          </div>

          {/* Row 4: Brand Kits — visual left, text right */}
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
            <div className="order-2 md:order-1">
              <BrandKitMockup />
            </div>
            <div className="order-1 md:order-2">
              <h2 className="font-[family-name:var(--font-press-start)] text-sm md:text-lg mb-4">
                Season everything to taste
              </h2>
              <p className="font-[family-name:var(--font-geist-sans)] text-base md:text-lg text-brand/80 leading-relaxed">
                Upload your logo, set your colors and fonts. Every image comes out on-brand, every time. No more off-brand release graphics cobbled together in Figma.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* S3: Pricing — Retro Menu Board */}
      <section className="py-16 md:py-20 bg-white border-y-2 border-brand">
        <div className="mx-auto max-w-2xl px-4 md:px-8">
          {/* Menu board card */}
          <div className="border-[3px] border-brand shadow-[6px_6px_0_var(--color-brand)] overflow-hidden">
            {/* Menu header bar */}
            <div className="bg-brand text-gold px-5 py-4 text-center">
              <h2 className="font-[family-name:var(--font-press-start)] text-sm md:text-base">
                brag.fast menu
              </h2>
              <p className="font-[family-name:var(--font-geist-sans)] text-xs text-surface/60 mt-1">
                1 credit = 1 image in 1 format
              </p>
            </div>

            {/* Menu items */}
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

            {/* Menu footer */}
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

      {/* S4: Demo + Final CTA */}
      <section className="py-16 md:py-24 bg-gold border-y-2 border-brand">
        <div className="mx-auto max-w-5xl px-4 md:px-8 text-center">
          <h2 className="font-[family-name:var(--font-press-start)] text-lg md:text-2xl mb-4">
            See the kitchen in action
          </h2>
          <p className="font-[family-name:var(--font-geist-sans)] text-base md:text-lg text-brand/80 leading-relaxed mb-8">
            Pick a template, tweak the ingredients, hit generate.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/demo"
              className="inline-block font-[family-name:var(--font-press-start)] text-xs md:text-sm px-6 py-4 text-surface border-2 border-brand bg-brand shadow-[4px_4px_0_rgba(0,0,0,0.3)] hover:shadow-[2px_2px_0_rgba(0,0,0,0.3)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
            >
              Try the Demo
            </Link>
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

      {/* S8: Footer */}
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
