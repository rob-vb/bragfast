import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { LandingNav } from "@/components/landing/landing-nav";
import { PAID_PLANS, type PlanConfig } from "@/lib/plans";

export const metadata: Metadata = {
  title: "Bragfast — Auto-generate social images for your launches",
  description:
    "Generate branded social media images from your releases. One API call or no-code workflow — landscape, square, and portrait formats in seconds.",
};

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
          ? "bg-gold shadow-[6px_6px_0_var(--color-brand)] md:-translate-y-2"
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
        <Link
          href="/signup"
          className={`block text-center font-[family-name:var(--font-press-start)] text-[10px] px-4 py-3 border-2 border-brand transition-all ${
            featured
              ? "bg-brand text-surface shadow-[3px_3px_0_rgba(0,0,0,0.3)] hover:shadow-[1px_1px_0_rgba(0,0,0,0.3)] hover:translate-x-[2px] hover:translate-y-[2px]"
              : "bg-gold text-brand shadow-[3px_3px_0_var(--color-brand)] hover:shadow-[1px_1px_0_var(--color-brand)] hover:translate-x-[2px] hover:translate-y-[2px]"
          }`}
        >
          Get Started
        </Link>
      </div>
    </div>
  );
}

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
              brag.fast auto-generates (branded) images from one API call. Landscape, square, and portrait, so you can post them to your socials immediately.
              Feed your audience.
            </p>
            <Link
              href="/signup"
              className="inline-block font-[family-name:var(--font-press-start)] text-xs md:text-sm px-6 py-4 text-brand border-2 border-brand bg-gold shadow-[4px_4px_0_var(--color-brand)] hover:shadow-[2px_2px_0_var(--color-brand)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
            >
              Get 30 Free Credits
            </Link>
            <p className="font-[family-name:var(--font-geist-sans)] text-sm text-brand/50 mt-3">
              No credit card required
            </p>
          </div>

          {/* Right: video placeholder in browser chrome */}
          <div className="border-2 border-brand bg-white shadow-[6px_6px_0_var(--color-brand)]">
            <div className="border-b-2 border-brand px-3 py-1.5 flex items-center gap-1.5">
              <span className="block h-2 w-2 border border-brand bg-gold" />
              <span className="block h-2 w-2 border border-brand bg-surface" />
              <span className="block h-2 w-2 border border-brand bg-surface" />
            </div>
            <div className="aspect-video flex items-center justify-center text-brand/30 bg-surface/50">
              <p className="font-[family-name:var(--font-press-start)] text-[10px]">
                [ product video ]
              </p>
            </div>
          </div>
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
                Cooked new features? Use our REST API to generate images. Ready to serve.
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
  bragfast.com/api/v1/release \\
  -H "Authorization: Bearer bf_key" \\
  -d '{
    "template": "classic",
    "slides": [{
      "objects": [
        { "id": "title",
          "text": "Dark mode is here" },
        { "id": "image",
          "image_url": "https://..." }
      ]
    }],
    "formats": ["landscape",
      "square", "portrait"]
  }'`}
                </code>
              </pre>
            </div>
          </div>

          {/* Row 2: No-Code — visual left, text right */}
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
            <div className="order-2 md:order-1">
              {/* Workflow diagram */}
              <div className="border-2 border-brand bg-white p-6 shadow-[4px_4px_0_var(--color-brand)]">
                <div className="flex flex-col gap-3">
                  {[
                    { icon: "&#9889;", label: "New release", bg: "bg-white" },
                    { icon: "&#127859;", label: "brag.fast generates images", bg: "bg-gold" },
                    { icon: "&#10003;", label: "Post to socials", bg: "bg-white" },
                  ].map((step, i) => (
                    <div key={step.label}>
                      <div className={`flex items-center gap-3 border-2 border-brand px-4 py-3 ${step.bg}`}>
                        <span className="text-base" dangerouslySetInnerHTML={{ __html: step.icon }} />
                        <p className="font-[family-name:var(--font-press-start)] text-[9px]">
                          {step.label}
                        </p>
                      </div>
                      {i < 2 && (
                        <div className="flex justify-center py-1">
                          <span className="font-[family-name:var(--font-press-start)] text-brand/30 text-xs">
                            &darr;
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {/* Integration badges */}
                <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t-2 border-brand/10">
                  {["n8n", "Zapier", "GitHub Actions"].map((name) => (
                    <span
                      key={name}
                      className="font-[family-name:var(--font-press-start)] text-[8px] px-2 py-1 border border-brand/30 text-brand/60"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="order-1 md:order-2">
              <h2 className="font-[family-name:var(--font-press-start)] text-sm md:text-lg mb-4">
                We&apos;ve got the no-code cooks covered aswell
              </h2>
              <p className="font-[family-name:var(--font-geist-sans)] text-base md:text-lg text-brand/80 leading-relaxed mb-6">
                Set up a workflow once. Every time you ship, brag.fast cooks up
                branded images in every format you need.
              </p>
              <Link
                href="/docs"
                className="inline-block font-[family-name:var(--font-press-start)] text-[10px] px-4 py-3 text-brand border-2 border-brand bg-white shadow-[3px_3px_0_var(--color-brand)] hover:shadow-[1px_1px_0_var(--color-brand)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
              >
                See Integrations
              </Link>
            </div>
          </div>

        </div>
      </section>

      {/* S3: Pricing */}
      <section className="py-16 md:py-20 bg-white border-y-2 border-brand">
        <div className="mx-auto max-w-5xl px-4 md:px-8">
          <h2 className="font-[family-name:var(--font-press-start)] text-sm md:text-lg mb-10 text-center">
            Start free. Scale when you&apos;re hungry.
          </h2>

          <div className="grid gap-4 md:grid-cols-3">
            {PAID_PLANS.map((plan) => (
              <PricingCard key={plan.id} plan={plan} featured={plan.id === "pro"} />
            ))}
          </div>

          <p className="font-[family-name:var(--font-geist-sans)] text-sm text-brand/60 text-center mt-6">
            1 credit = 1 image in 1 format
          </p>
        </div>
      </section>

      {/* S4: Demo + Final CTA */}
      <section className="py-16 md:py-24 bg-gold border-y-2 border-brand">
        <div className="mx-auto max-w-5xl px-4 md:px-8 text-center">
          <h2 className="font-[family-name:var(--font-press-start)] text-lg md:text-2xl mb-4">
            See the kitchen in action
          </h2>
          <p className="font-[family-name:var(--font-geist-sans)] text-base md:text-lg text-brand/80 leading-relaxed mb-8">
            Pick a template, tweak the ingredients, hit generate. Three formats, zero signup required.
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
              Get 30 Free Credits
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
              alt="Bragfast"
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
