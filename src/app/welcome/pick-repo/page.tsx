import type { Metadata } from "next";
import { PickRepoClient } from "./pick-repo-client";

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
            We&rsquo;ll draft a brag post the next time a PR merges on the repo you pick. You can change this later.
          </p>
          <PickRepoClient />
        </div>
      </div>
    </div>
  );
}
