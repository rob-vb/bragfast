import Link from "next/link";
import type { Metadata } from "next";
import { isLaunchModeRepositioned } from "@/lib/launch-mode";

export const metadata: Metadata = {
  title: "Install brag.fast on GitHub",
  description: "Heads up before you install the brag.fast GitHub App.",
  robots: { index: false, follow: false },
};

export default function InstallWarningPage() {
  const appSlug = process.env.NEXT_PUBLIC_GITHUB_APP_SLUG ?? "";
  const installUrl = appSlug
    ? `https://github.com/apps/${appSlug}/installations/new`
    : "#";
  const skipPath = isLaunchModeRepositioned() ? "/welcome/brand" : "/admin";

  return (
    <div className="min-h-screen bg-surface text-brand flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl border-[3px] border-brand bg-white shadow-[6px_6px_0_var(--color-brand)]">
        <div className="bg-brand text-gold px-5 py-3 font-mono text-xs uppercase tracking-widest">
          ▸ Heads up — GitHub App install
        </div>
        <div className="p-6 sm:p-10 space-y-6">
          <h1 className="font-[family-name:var(--font-press-start)] text-xl md:text-2xl leading-[1.4]">
            One more step. Install our GitHub App.
          </h1>

          <div className="space-y-4 font-[family-name:var(--font-geist-sans)] text-base leading-relaxed text-brand/80">
            <p>
              GitHub will ask you to grant access. Read carefully:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                We <strong>only read</strong> pull request titles and merge events on the repos you pick.
              </li>
              <li>
                We <strong>do not</strong> read source code, comments, issues, or private metadata.
              </li>
              <li>
                Pick <strong>“Only select repositories”</strong> on the next screen if you want to scope us tightly. You can change this any time on github.com.
              </li>
              <li>
                If you’re an org member, your admin may need to approve.
              </li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link
              href={installUrl}
              className="inline-flex items-center justify-center font-[family-name:var(--font-press-start)] text-xs px-6 py-4 text-brand border-2 border-brand bg-gold shadow-[4px_4px_0_var(--color-brand)] hover:shadow-[2px_2px_0_var(--color-brand)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
            >
              Install on GitHub
            </Link>
            <Link
              href={skipPath}
              className="inline-flex items-center justify-center font-[family-name:var(--font-press-start)] text-xs px-6 py-4 text-brand border-2 border-brand bg-white shadow-[4px_4px_0_var(--color-brand)] hover:shadow-[2px_2px_0_var(--color-brand)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
            >
              Skip for now
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
