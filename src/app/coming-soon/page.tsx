import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Coming Soon — Bragfast",
  description: "This page is coming soon. Stay tuned.",
};

export default function ComingSoon() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-4">
      <div className="text-center">
        <h1 className="font-[family-name:var(--font-press-start)] text-lg md:text-2xl text-brand mb-6">
          Coming soon
        </h1>
        <p className="font-[family-name:var(--font-geist-sans)] text-brand/70 text-base md:text-lg mb-8 max-w-md">
          We&apos;re still cookin&apos; this one up. Check back soon.
        </p>
        <Link
          href="/"
          className="inline-block font-[family-name:var(--font-press-start)] text-[10px] px-4 py-3 text-brand border-2 border-brand bg-gold shadow-[3px_3px_0_var(--color-brand)] hover:shadow-[2px_2px_0_var(--color-brand)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
        >
          Back to home
        </Link>
      </div>

      <p className="absolute bottom-8 font-[family-name:var(--font-press-start)] text-[8px] text-brand/20 tracking-widest">
        ........
      </p>
    </div>
  );
}
