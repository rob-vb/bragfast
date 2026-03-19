import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { LandingNav } from "@/components/landing/landing-nav";

export const metadata: Metadata = {
  title: "Support — brag.fast",
  description:
    "Get in touch anytime. Questions, bug reports, feature requests — we read every message.",
  alternates: { canonical: "/support" },
};

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-surface text-brand">
      <LandingNav />

      {/* Hero */}
      <section className="flex-1 bg-gold border-t-2 border-brand">
        <div className="mx-auto max-w-2xl px-4 md:px-8 py-24 md:py-32 text-center flex flex-col items-center">
          <Image
            src="/logo-icon.svg"
            alt="brag.fast"
            width={140}
            height={140}
            className="h-28 w-auto md:h-36 mb-10"
          />
          <h1 className="font-[family-name:var(--font-press-start)] text-base md:text-xl leading-relaxed mb-4">
            Talk to the chef
          </h1>
          <p className="font-[family-name:var(--font-geist-sans)] text-sm md:text-base text-brand/70 leading-relaxed mb-10 max-w-md">
            Got a question, bug report, or feature request? We read every
            message.
          </p>
          <Link
            href="mailto:support@brag.fast"
            className="inline-block font-[family-name:var(--font-press-start)] text-xs md:text-sm px-6 py-4 text-surface border-2 border-brand bg-brand shadow-[4px_4px_0_rgba(0,0,0,0.3)] hover:shadow-[2px_2px_0_rgba(0,0,0,0.3)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
          >
            support@brag.fast
          </Link>
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
