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
  title: "brag.fast | Keep building, we'll market",
  description:
    "Turn shipped wins into branded visuals and post copy in seconds. Install the GitHub App, surface merges in your feed, brag when you're ready. Web app, MCP, or API. You approve every post.",
  alternates: { canonical: "/" },
};

const GITHUB_ICON_PATH =
  "M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12";

function githubAppInstallUrl(): string {
  const slug = process.env.NEXT_PUBLIC_GITHUB_APP_SLUG;
  return slug
    ? `https://github.com/apps/${slug}/installations/new`
    : "/signup";
}

const FAQ = [
  {
    q: "What kind of wins work?",
    a: "Anything worth posting. A merged PR, an MRR milestone, a traffic screenshot, launch numbers, a before/after. If you'd tell someone about it, brag.fast can dress it up.",
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
    q: "Does Sous-Chef post for me?",
    a: "No. Sous-Chef surfaces wins in your activity feed with a short summary and a brag-worthiness score. You hit Brag when you want a post, cook the visual in the Kitchen, edit copy, then approve. Nothing ships without you.",
  },
  {
    q: "How does Sous-Chef know what happened?",
    a: "You connect the integrations you want: GitHub for merges and stars, Stripe for revenue, PostHog or GA4 for traffic, and more. When something happens, brag.fast writes a surfaced trigger with a one-line summary. Every merge to your default branch shows up. You pick what to brag about.",
  },
  {
    q: "Can I use brag.fast from Claude Code?",
    a: "Yes. Add the MCP server at mcp.brag.fast and authenticate with an API key from your account. Your agent can start a cook, list templates and brands, and poll render status. Same branded output as the web Kitchen.",
  },
];

function SectionLabel({ children }: { children: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-6 h-[3px] bg-gold" />
      <span className="font-[family-name:var(--font-press-start)] text-[8px] text-gold uppercase tracking-wider">
        {children}
      </span>
    </div>
  );
}

export default function Home() {
  const githubInstallHref = githubAppInstallUrl();

  return (
    <div className="min-h-screen bg-surface text-brand" data-launch-mode={getLaunchMode()}>
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
        <div className="relative mx-auto max-w-6xl px-4 md:px-10 grid md:grid-cols-[1.1fr_1fr] gap-10 md:gap-16 items-center">
          <div>
            <h1 className="font-[family-name:var(--font-press-start)] text-2xl md:text-4xl leading-[1.4] mb-6">
              Keep building.
              <span className="block">We&apos;ll market.</span>
            </h1>
            <p className="font-[family-name:var(--font-geist-sans)] text-base md:text-lg text-brand/80 max-w-xl mb-8 leading-relaxed">
              brag.fast turns shipped wins into branded visuals and post-ready copy in seconds. You stay in the loop: surface, brag, cook, approve. From the web app, via MCP, or your own scripts.
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

      {/* Before / After */}
      <section className="py-16 md:py-24 bg-surface border-b-2 border-brand">
        <div className="mx-auto max-w-6xl px-4 md:px-10">
          <div className="text-center mb-10">
            <h2 className="font-[family-name:var(--font-press-start)] text-sm md:text-xl leading-[1.5] mb-3">
              Which post would you stop for?
            </h2>
            <p className="font-[family-name:var(--font-geist-sans)] text-base text-brand/60 max-w-xl mx-auto">
              Plain text scrolls past. A branded visual earns the pause.
            </p>
          </div>
          <BeforeAfter />
        </div>
      </section>

      {/* Templates + Brand kits */}
      <section className="py-16 md:py-24 bg-white border-b-2 border-brand">
        <div className="mx-auto max-w-6xl px-4 md:px-10">
          <div className="grid md:grid-cols-2 gap-12 md:gap-16">
            <div className="flex flex-col gap-6">
              <SectionLabel>Templates</SectionLabel>
              <h3 className="font-[family-name:var(--font-press-start)] text-sm md:text-xl leading-[1.5]">
                Design it once. Reuse forever.
              </h3>
              <p className="font-[family-name:var(--font-geist-sans)] text-base md:text-lg text-brand/80 leading-relaxed">
                Drag objects. Set colors. Preview live. Every render follows the layout you built.
              </p>
              <div className="border-2 border-brand bg-white p-6 shadow-[4px_4px_0_var(--color-brand)]">
                <LazyVideo
                  src="/demo/template_editor_compressed.mp4"
                  className="w-full border border-brand"
                />
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <SectionLabel>Branding</SectionLabel>
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

      {/* MCP / Claude Code */}
      <section
        id="mcp"
        className="scroll-mt-16 py-16 md:py-24 bg-surface border-b-2 border-brand"
      >
        <div className="mx-auto max-w-6xl px-4 md:px-10">
          <div className="grid md:grid-cols-[1fr_1.05fr] gap-10 md:gap-14 items-start">
            <div className="flex flex-col gap-5">
              <SectionLabel>MCP</SectionLabel>
              <h2 className="font-[family-name:var(--font-press-start)] text-base md:text-2xl leading-[1.4]">
                Your agent in the kitchen.
              </h2>
              <p className="font-[family-name:var(--font-geist-sans)] text-base md:text-lg text-brand/80 leading-relaxed max-w-md">
                Wire brag.fast into Claude Code, Claude Desktop, Cursor, or any HTTP MCP client. Ask for a cook, pick a template, get branded images back without leaving your flow.
              </p>
              <Link
                href="/docs"
                className="font-[family-name:var(--font-geist-sans)] text-sm text-brand underline underline-offset-4 self-start hover:text-gold transition-colors"
              >
                Read the API docs &#9656;
              </Link>
            </div>
            <div className="border-2 border-brand bg-[#24292e] p-5 md:p-6 shadow-[6px_6px_0_var(--color-brand)] space-y-4">
              <div>
                <p className="font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-wider text-zinc-500 mb-1">
                  Server URL
                </p>
                <p className="font-[family-name:var(--font-geist-mono)] text-sm text-emerald-400 break-all">
                  https://mcp.brag.fast/mcp
                </p>
              </div>
              <div>
                <p className="font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-wider text-zinc-500 mb-2">
                  Claude Code
                </p>
                <pre className="font-[family-name:var(--font-geist-mono)] text-xs text-zinc-200 leading-relaxed overflow-x-auto whitespace-pre-wrap">
                  {`claude mcp add bragfast \\
  --transport http \\
  https://mcp.brag.fast/mcp`}
                </pre>
              </div>
              <p className="font-[family-name:var(--font-geist-sans)] text-xs text-zinc-400 leading-relaxed">
                Create an account, then issue an API key under Admin → Keys. Tools include start_cook, generate_release_images, list_templates, and check_account.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Kitchen */}
      <section
        id="kitchen"
        className="scroll-mt-16 py-16 md:py-24 bg-white border-b-2 border-brand"
      >
        <div className="mx-auto max-w-6xl px-4 md:px-10">
          <div className="grid md:grid-cols-[1.1fr_0.9fr] gap-10 md:gap-14 items-center">
            <div className="md:order-2 flex flex-col gap-5">
              <SectionLabel>Web app</SectionLabel>
              <h2 className="font-[family-name:var(--font-press-start)] text-base md:text-2xl leading-[1.4]">
                Cook it yourself.
              </h2>
              <p className="font-[family-name:var(--font-geist-sans)] text-base md:text-lg text-brand/80 leading-relaxed max-w-md">
                Drop a screenshot or recording, pick a template, season with your brand. Landscape, square, and portrait in about a minute. No agent required.
              </p>
              <CtaLink
                signedOutHref="/signup"
                signedInHref="/admin/kitchen"
                className="inline-block self-start font-[family-name:var(--font-press-start)] text-[10px] px-4 py-3 mt-2 text-brand border-2 border-brand bg-gold shadow-[3px_3px_0_var(--color-brand)] hover:shadow-[1px_1px_0_var(--color-brand)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
              >
                Open the Kitchen
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

      {/* Sous-Chef: ship → surface → brag */}
      <section className="pt-16 md:pt-24 pb-0 bg-surface border-b-2 border-brand overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 md:px-10">
          <div className="grid md:grid-cols-[1fr_1.1fr] gap-10 md:gap-14">
            <div className="flex flex-col gap-5 pb-16 md:pb-24">
              <SectionLabel>Sous-Chef</SectionLabel>
              <h2 className="font-[family-name:var(--font-press-start)] text-base md:text-2xl leading-[1.4]">
                Ship. Surface. Brag.
              </h2>
              <p className="font-[family-name:var(--font-geist-sans)] text-base md:text-lg text-brand/80 leading-relaxed max-w-md">
                Install the GitHub App on the repos you ship from. Sous-Chef watches your default branch: every merge lands in your activity feed with a one-line summary and a brag-worthiness score. Hit <strong>Brag</strong> when you want a post. We open the Kitchen with context. You cook, edit, approve. Schedule with <strong>Buffer</strong> or <strong>Postiz</strong> when you&apos;re ready.
              </p>
              <ol className="font-[family-name:var(--font-geist-sans)] text-sm text-brand/75 space-y-2 list-decimal list-inside max-w-md">
                <li>Merge ships to main</li>
                <li>Feed surfaces what happened (nothing hidden)</li>
                <li>You brag, cook, and post on your terms</li>
              </ol>
              <div className="flex flex-col items-start gap-3 mt-4 max-w-sm">
                <div
                  className="w-12 h-12 flex items-center justify-center border-2 border-brand bg-cream shadow-[3px_3px_0_var(--color-brand)]"
                  aria-hidden
                >
                  <svg viewBox="0 0 24 24" className="w-6 h-6 fill-brand">
                    <path d={GITHUB_ICON_PATH} />
                  </svg>
                </div>
                <a
                  href={githubInstallHref}
                  className="inline-flex items-center justify-center font-[family-name:var(--font-press-start)] text-[10px] px-4 py-3 text-brand border-2 border-brand bg-gold shadow-[3px_3px_0_var(--color-brand)] hover:shadow-[1px_1px_0_var(--color-brand)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                  {...(githubInstallHref.startsWith("http")
                    ? { target: "_blank", rel: "noopener noreferrer" }
                    : {})}
                >
                  Install GitHub App
                </a>
                <p className="font-[family-name:var(--font-geist-sans)] text-xs text-brand/55 leading-relaxed">
                  On GitHub, choose which repos to watch. Merges to your default branch surface in your feed.
                </p>
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

      {/* Pricing */}
      <section className="py-16 md:py-24 bg-white border-b-2 border-brand">
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
              Pay for cooks. You approve every post that goes out.
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
      <section className="py-16 md:py-24 bg-surface border-b-2 border-brand">
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
            Keep building. <span className="block md:inline">Brag when it counts.</span>
          </h2>
          <p className="font-[family-name:var(--font-geist-sans)] text-base md:text-lg text-brand/80 leading-relaxed mb-8 max-w-xl mx-auto">
            30 free credits. No credit card. First cook in under a minute.
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
