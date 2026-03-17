import Image from "next/image";
import type { Metadata } from "next";
import { LandingNav } from "@/components/landing/landing-nav";

export const metadata: Metadata = {
  title: "Support — brag.fast",
  description:
    "Need help with brag.fast? Reach out to our support team and we'll get you sorted.",
};

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-surface text-brand">
      <LandingNav />

      <article className="px-4 py-16 md:py-20 md:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <Image
            src="/logo-icon.svg"
            alt="brag.fast"
            width={64}
            height={64}
            className="mx-auto mb-8 h-16 w-16"
          />

          <h1 className="font-[family-name:var(--font-press-start)] text-sm md:text-lg mb-6">
            Need a hand?
          </h1>

          <div className="space-y-4 font-[family-name:var(--font-geist-sans)] text-sm text-brand/80 leading-relaxed">
            <p>
              Whether something&apos;s broken, confusing, or you just want to
              say hi — we&apos;re here for it. No ticket queues, no bots, just
              real humans who know the kitchen inside out.
            </p>
            <p>
              Drop us a line at{" "}
              <a
                href="mailto:support@brag.fast"
                className="underline hover:text-brand font-semibold"
              >
                support@brag.fast
              </a>{" "}
              and we&apos;ll get back to you faster than a hot deploy.
            </p>
          </div>
        </div>
      </article>
    </div>
  );
}
