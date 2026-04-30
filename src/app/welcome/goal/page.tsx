import type { Metadata } from "next";
import { GoalStepClient } from "./goal-client";

export const metadata: Metadata = {
  title: "Set a goal",
  description: "Pick what brag.fast should celebrate.",
  robots: { index: false, follow: false },
};

export default function WelcomeGoalPage() {
  return (
    <div className="min-h-screen bg-surface text-brand flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl border-[3px] border-brand bg-white shadow-[6px_6px_0_var(--color-brand)]">
        <div className="bg-brand text-gold px-5 py-3 font-mono text-xs uppercase tracking-widest flex items-center justify-between">
          <span>▸ Set a goal · step 2 of 3</span>
          <span className="text-gold/60">brand → goal → source</span>
        </div>
        <div className="p-6 sm:p-10 space-y-4">
          <h1 className="font-[family-name:var(--font-press-start)] text-xl md:text-2xl leading-[1.4]">
            What should we celebrate?
          </h1>
          <p className="font-[family-name:var(--font-geist-sans)] text-base leading-relaxed text-brand/80">
            Pick a goal — brag.fast posts automatically when you cross the line.
          </p>
          <GoalStepClient />
        </div>
      </div>
    </div>
  );
}
