import Link from "next/link";
import type { Metadata } from "next";
import { LandingNav } from "@/components/landing/landing-nav";

export const metadata: Metadata = {
  title: "Bragfast — Auto-generate social images for your launches",
  description:
    "Generate branded social media images from your releases. One API call or no-code workflow — landscape, square, and portrait formats in seconds.",
};

export default function Home() {
  return (
    <div className="min-h-screen bg-[#FFF8F0] text-[#4A3326]">
      <LandingNav />

      {/* Hero */}
      <section className="px-4 pt-16 pb-20 md:pt-24 md:pb-28 md:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="font-[family-name:var(--font-press-start)] text-xl md:text-3xl leading-relaxed mb-6">
            Show what you&apos;ve been cookin&apos;
          </h1>
          <p className="font-[family-name:var(--font-geist-sans)] text-base md:text-lg text-[#4A3326]/80 max-w-xl mx-auto mb-8 leading-relaxed">
            Bragfast auto-generates branded social media images from your
            releases. Connect a workflow or call the API. Served in seconds, not
            hours.
          </p>
          <Link
            href="/signup"
            className="inline-block font-[family-name:var(--font-press-start)] text-xs md:text-sm px-6 py-4 text-[#4A3326] border-2 border-[#4A3326] bg-[#F8AF3C] shadow-[4px_4px_0_#4A3326] hover:shadow-[2px_2px_0_#4A3326] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
          >
            Get 30 Free Credits
          </Link>
          <p className="font-[family-name:var(--font-geist-sans)] text-sm text-[#4A3326]/50 mt-3">
            No credit card required
          </p>

          {/* Product visual placeholder */}
          <div className="mt-12 mx-auto max-w-2xl border-2 border-[#4A3326] bg-white shadow-[6px_6px_0_#4A3326]">
            <div className="border-b-2 border-[#4A3326] px-3 py-1.5 flex items-center gap-1.5">
              <span className="block h-2 w-2 border border-[#4A3326] bg-[#F8AF3C]" />
              <span className="block h-2 w-2 border border-[#4A3326] bg-[#FFF8F0]" />
              <span className="block h-2 w-2 border border-[#4A3326] bg-[#FFF8F0]" />
            </div>
            <div className="flex items-center justify-center py-24 md:py-32 text-[#4A3326]/30">
              <p className="font-[family-name:var(--font-press-start)] text-[10px]">
                [ product visual ]
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pain */}
      <section className="px-4 py-16 md:py-20 md:px-8 bg-white border-y-2 border-[#4A3326]">
        <div className="mx-auto max-w-2xl">
          <h2 className="font-[family-name:var(--font-press-start)] text-sm md:text-lg mb-6 text-center">
            You build. But do you brag?
          </h2>
          <p className="font-[family-name:var(--font-geist-sans)] text-base md:text-lg text-[#4A3326]/80 leading-relaxed">
            You shipped three features this week. How many did your audience hear
            about? Most indie hackers skip the marketing image because it takes
            20 minutes in Canva — per platform, per format. So your best work
            launches quietly. No LinkedIn post. No tweet with a screenshot. Your
            features deserve better than silence.
          </p>
        </div>
      </section>

      {/* No-Code */}
      <section className="px-4 py-16 md:py-20 md:px-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-[family-name:var(--font-press-start)] text-sm md:text-lg mb-2 text-center">
            No code? No problem.
          </h2>
          <p className="font-[family-name:var(--font-press-start)] text-[10px] md:text-xs text-[#4A3326]/60 text-center mb-8">
            Just set the table.
          </p>
          <p className="font-[family-name:var(--font-geist-sans)] text-base md:text-lg text-[#4A3326]/80 leading-relaxed text-center max-w-2xl mx-auto mb-10">
            Set up a workflow once. Every time you ship, Bragfast cooks up
            branded images in the sizes you need — landscape for Twitter, square
            for Instagram, portrait for Stories. No API keys. No terminal. Just
            drag, drop, and serve.
          </p>

          {/* Workflow diagram */}
          <div className="flex flex-col md:flex-row items-center justify-center gap-3 md:gap-4 mb-10">
            <div className="border-2 border-[#4A3326] bg-white px-4 py-3 shadow-[3px_3px_0_#4A3326]">
              <p className="font-[family-name:var(--font-press-start)] text-[9px] text-center">
                New release
              </p>
            </div>
            <span className="font-[family-name:var(--font-press-start)] text-[#4A3326]/40 text-xs rotate-90 md:rotate-0">
              &rarr;
            </span>
            <div className="border-2 border-[#4A3326] bg-[#F8AF3C] px-4 py-3 shadow-[3px_3px_0_#4A3326]">
              <p className="font-[family-name:var(--font-press-start)] text-[9px] text-center">
                Bragfast
              </p>
            </div>
            <span className="font-[family-name:var(--font-press-start)] text-[#4A3326]/40 text-xs rotate-90 md:rotate-0">
              &rarr;
            </span>
            <div className="border-2 border-[#4A3326] bg-white px-4 py-3 shadow-[3px_3px_0_#4A3326]">
              <p className="font-[family-name:var(--font-press-start)] text-[9px] text-center">
                Images ready
              </p>
            </div>
          </div>

          {/* Integration badges */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {["n8n", "Zapier", "GitHub Actions"].map((name) => (
              <span
                key={name}
                className="font-[family-name:var(--font-press-start)] text-[8px] px-3 py-1.5 border-2 border-[#4A3326] bg-[#FFF8F0] text-[#4A3326]/70"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* API */}
      <section className="px-4 py-16 md:py-20 md:px-8 bg-[#4A3326] text-[#FFF8F0]">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-[family-name:var(--font-press-start)] text-sm md:text-lg mb-6 text-center">
            For developers who automate everything
          </h2>
          <p className="font-[family-name:var(--font-geist-sans)] text-base md:text-lg text-[#FFF8F0]/80 leading-relaxed text-center max-w-2xl mx-auto mb-10">
            One POST request. Three image formats. Branded and ready to share.
            Plug Bragfast into your CI/CD pipeline, your release script, or your
            custom dashboard. Async by design — fire the request, get a webhook
            when your images are served hot.
          </p>

          {/* Code block */}
          <div className="border-2 border-[#FFF8F0]/30 bg-[#3a2a1f] shadow-[4px_4px_0_rgba(255,248,240,0.15)]">
            <div className="border-b-2 border-[#FFF8F0]/20 px-3 py-1.5">
              <span className="font-[family-name:var(--font-press-start)] text-[8px] text-[#F8AF3C]">
                terminal
              </span>
            </div>
            <pre className="p-4 overflow-x-auto">
              <code className="font-[family-name:var(--font-geist-mono)] text-xs md:text-sm text-[#FFF8F0]/90 leading-relaxed">
{`curl -X POST https://bragfast.com/api/v1/release \\
  -H "Authorization: Bearer bf_your_key" \\
  -d '{
    "brand_id": "br_abc123",
    "template": "classic",
    "slides": [{
      "title": "Dark mode is here",
      "description": "Your most requested feature.",
      "image_url": "https://your-app.com/screenshot.png"
    }],
    "formats": ["landscape", "square", "portrait"]
  }'`}
              </code>
            </pre>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-4 py-16 md:py-20 md:px-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-[family-name:var(--font-press-start)] text-sm md:text-lg mb-10 text-center">
            Three steps. Breakfast is served.
          </h2>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                step: "1",
                title: "Set up your brand",
                desc: "Upload your logo, pick your colors, choose a font. One-time prep.",
              },
              {
                step: "2",
                title: "Send your release",
                desc: "Trigger a workflow or call the API with your title and a screenshot.",
              },
              {
                step: "3",
                title: "Feed your audience",
                desc: "Branded images in landscape, square, and portrait. Download or auto-post.",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="border-2 border-[#4A3326] bg-white p-5 shadow-[4px_4px_0_#4A3326]"
              >
                <span className="inline-block font-[family-name:var(--font-press-start)] text-xs mb-3 bg-[#F8AF3C] border-2 border-[#4A3326] px-2 py-1">
                  {item.step}
                </span>
                <h3 className="font-[family-name:var(--font-press-start)] text-[10px] md:text-xs mb-2">
                  {item.title}
                </h3>
                <p className="font-[family-name:var(--font-geist-sans)] text-sm text-[#4A3326]/70 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Templates */}
      <section className="px-4 py-16 md:py-20 md:px-8 bg-white border-y-2 border-[#4A3326]">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-[family-name:var(--font-press-start)] text-sm md:text-lg mb-10 text-center">
            Three templates. Every format.
          </h2>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                name: "Classic",
                desc: "Text on top, screenshot on bottom. Clean and versatile.",
              },
              {
                name: "Split",
                desc: "Side-by-side on desktop, stacked on mobile. Great for before/after.",
              },
              {
                name: "Hero",
                desc: "Full-bleed image with text overlay. Bold and attention-grabbing.",
              },
            ].map((t) => (
              <div
                key={t.name}
                className="border-2 border-[#4A3326] bg-[#FFF8F0] shadow-[3px_3px_0_#4A3326]"
              >
                {/* Template preview placeholder */}
                <div className="flex items-center justify-center py-16 border-b-2 border-[#4A3326] text-[#4A3326]/30">
                  <p className="font-[family-name:var(--font-press-start)] text-[8px]">
                    [ {t.name.toLowerCase()} ]
                  </p>
                </div>
                <div className="p-4">
                  <h3 className="font-[family-name:var(--font-press-start)] text-[10px] mb-2">
                    {t.name}
                  </h3>
                  <p className="font-[family-name:var(--font-geist-sans)] text-sm text-[#4A3326]/70 leading-relaxed">
                    {t.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <p className="font-[family-name:var(--font-geist-sans)] text-sm text-[#4A3326]/60 text-center mt-8">
            Each template renders in landscape, square, and portrait. One
            request, a full plate of content.
          </p>
        </div>
      </section>

      {/* Pricing */}
      <section className="px-4 py-16 md:py-20 md:px-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-[family-name:var(--font-press-start)] text-sm md:text-lg mb-10 text-center">
            Start free. Scale when you&apos;re hungry.
          </h2>

          <div className="grid gap-4 md:grid-cols-4">
            {[
              {
                name: "Trial",
                price: "Free",
                credits: "30 credits",
                label: "Try it out",
              },
              {
                name: "Starter",
                price: "$39/mo",
                credits: "800/mo",
                label: "Solo builders",
                highlight: false,
              },
              {
                name: "Growth",
                price: "$79/mo",
                credits: "2,000+/mo",
                label: "Small teams",
                highlight: true,
              },
              {
                name: "Scale",
                price: "$149/mo",
                credits: "5,000+/mo",
                label: "Growing companies",
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`border-2 border-[#4A3326] p-4 shadow-[3px_3px_0_#4A3326] ${
                  plan.highlight
                    ? "bg-[#F8AF3C]"
                    : "bg-white"
                }`}
              >
                <h3 className="font-[family-name:var(--font-press-start)] text-[10px] mb-3">
                  {plan.name}
                </h3>
                <p className="font-[family-name:var(--font-press-start)] text-sm md:text-base mb-1">
                  {plan.price}
                </p>
                <p className="font-[family-name:var(--font-geist-sans)] text-sm text-[#4A3326]/70 mb-2">
                  {plan.credits}
                </p>
                <p className="font-[family-name:var(--font-geist-sans)] text-xs text-[#4A3326]/50">
                  {plan.label}
                </p>
              </div>
            ))}
          </div>

          <p className="font-[family-name:var(--font-geist-sans)] text-sm text-[#4A3326]/60 text-center mt-6">
            1 credit = 1 image in 1 format
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-4 py-16 md:py-24 md:px-8 bg-[#F8AF3C] border-y-2 border-[#4A3326]">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-[family-name:var(--font-press-start)] text-lg md:text-2xl mb-6">
            Ship it. Brag it.
          </h2>
          <p className="font-[family-name:var(--font-geist-sans)] text-base md:text-lg text-[#4A3326]/80 leading-relaxed mb-8">
            You&apos;re already building great stuff. Let your audience know.
            Start with 30 free credits — no credit card, no strings.
          </p>
          <Link
            href="/signup"
            className="inline-block font-[family-name:var(--font-press-start)] text-xs md:text-sm px-6 py-4 text-[#FFF8F0] border-2 border-[#4A3326] bg-[#4A3326] shadow-[4px_4px_0_rgba(0,0,0,0.3)] hover:shadow-[2px_2px_0_rgba(0,0,0,0.3)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
          >
            Get 30 Free Credits
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 py-8 md:px-8 border-t-2 border-[#4A3326] bg-[#FFF8F0]">
        <div className="mx-auto max-w-3xl flex flex-col md:flex-row items-center justify-between gap-4">
          <Link
            href="/"
            className="font-[family-name:var(--font-press-start)] text-[10px] text-[#4A3326]/60"
          >
            brag.fast
          </Link>
          <p className="font-[family-name:var(--font-press-start)] text-[8px] text-[#4A3326]/40 italic">
            The most important meal of your launch.
          </p>
        </div>
      </footer>
    </div>
  );
}
