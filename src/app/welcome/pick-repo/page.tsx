import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pick a repo",
  description: "Choose a repo to watch for merges.",
  robots: { index: false, follow: false },
};

export default function PickRepoPage() {
  return (
    <div className="min-h-screen bg-surface text-brand flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl border-[3px] border-brand bg-white shadow-[6px_6px_0_var(--color-brand)]">
        <div className="bg-brand text-gold px-5 py-3 font-mono text-xs uppercase tracking-widest">
          ▸ Pick a repo to watch
        </div>
        <div className="p-6 sm:p-10 space-y-6">
          <h1 className="font-[family-name:var(--font-press-start)] text-xl md:text-2xl leading-[1.4]">
            Install received. Pick the repo we should watch.
          </h1>
          <p className="font-[family-name:var(--font-geist-sans)] text-base leading-relaxed text-brand/80">
            We&rsquo;ll draft a brag post the next time a PR merges. Repo picker UI lands in S3.4 — for now, head to your dashboard.
          </p>
          <Link
            href="/admin"
            className="inline-flex items-center justify-center font-[family-name:var(--font-press-start)] text-xs px-6 py-4 text-brand border-2 border-brand bg-gold shadow-[4px_4px_0_var(--color-brand)] hover:shadow-[2px_2px_0_var(--color-brand)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
          >
            Continue to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
