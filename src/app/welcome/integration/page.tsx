import type { Metadata } from "next";
import { Suspense } from "react";
import { IntegrationStepClient } from "./integration-client";

export const metadata: Metadata = {
  title: "Connect a source",
  description: "Wire up the source that feeds your goal.",
  robots: { index: false, follow: false },
};

export default function WelcomeIntegrationPage() {
  return (
    <div className="min-h-screen bg-surface text-brand flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl border-[3px] border-brand bg-white shadow-[6px_6px_0_var(--color-brand)]">
        <div className="bg-brand text-gold px-5 py-3 font-mono text-xs uppercase tracking-widest flex items-center justify-between">
          <span>▸ Connect a source · step 3 of 3</span>
          <span className="text-gold/60">brand → goal → source</span>
        </div>
        <div className="p-6 sm:p-10 space-y-6">
          <Suspense fallback={null}>
            <IntegrationStepClient />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
