import type { Metadata } from "next";
import Link from "next/link";
import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { LandingNav } from "@/components/landing/landing-nav";
import { PublicTemplateCard } from "@/components/shared/public-template-card";
import type { CanvasTemplateConfig } from "@/lib/templates/canvas-types";

export const metadata: Metadata = {
  title: "Template Library | brag.fast",
  description:
    "Browse the brag.fast template library. Pick a layout, see what your release will look like, and import it into your kitchen with one click.",
  alternates: { canonical: "/templates" },
};

export default async function TemplatesGalleryPage() {
  const templates = await fetchQuery(api.templates.listPublicTemplates, {});

  return (
    <div className="min-h-screen bg-surface text-brand">
      <LandingNav />

      <section className="py-12 md:py-20">
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <header className="text-center mb-10 md:mb-14">
            <h1 className="font-[family-name:var(--font-press-start)] text-lg md:text-2xl leading-relaxed mb-4">
              Template Library
            </h1>
            <p className="font-[family-name:var(--font-geist-sans)] text-base md:text-lg text-brand/70 max-w-2xl mx-auto leading-relaxed">
              Pick a layout. See what your release will look like. Import it to your kitchen.
            </p>
          </header>

          {templates.length === 0 ? (
            <div className="border-2 border-brand bg-white p-8 text-center shadow-[4px_4px_0_var(--color-brand)]">
              <p className="font-[family-name:var(--font-geist-sans)] text-sm text-brand/60">
                No public templates yet. Check back soon.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {templates.map((t) => (
                <PublicTemplateCard
                  key={t.externalId}
                  externalId={t.externalId}
                  name={t.name}
                  medium={t.medium}
                  previewUrl={t.previewUrls?.landscape}
                  palette={t.palette}
                  config={t.config as CanvasTemplateConfig | null}
                />
              ))}
            </div>
          )}

          <div className="text-center mt-12 md:mt-16">
            <p className="font-[family-name:var(--font-geist-sans)] text-sm text-brand/60 mb-4">
              Want to ship your own? Sign up — 30 free credits, no card.
            </p>
            <Link
              href="/signup"
              className="inline-block font-[family-name:var(--font-press-start)] text-[10px] md:text-xs px-6 py-4 text-brand border-2 border-brand bg-gold shadow-[4px_4px_0_var(--color-brand)] hover:shadow-[2px_2px_0_var(--color-brand)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
            >
              Start cooking
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
