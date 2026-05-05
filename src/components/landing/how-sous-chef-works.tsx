"use client";

import { useState } from "react";

type Step = {
  id: number;
  title: string;
  body: string;
  badge: string;
};

const STEPS: Step[] = [
  { id: 1, title: "Connect", body: "Connect your GitHub app + integrations.", badge: "Link" },
  { id: 2, title: "Watch", body: "Sous-Chef watches releases, merges, and milestones.", badge: "Scan" },
  { id: 3, title: "Daily Brief", body: "A summary is prepared with your best wins.", badge: "Brief" },
  { id: 4, title: "Drafts → Kitchen", body: "Auto-drafts are generated in your brand style.", badge: "Cook" },
  { id: 5, title: "Serve + Share", body: "Approve and publish manually or scheduled.", badge: "Ship" },
];

export function HowSousChefWorks() {
  const [paused, setPaused] = useState(false);

  return (
    <section className="py-16 md:py-24 bg-white border-b-2 border-brand" aria-labelledby="how-sous-chef-works-heading">
      <div className="mx-auto max-w-6xl px-4 md:px-10">
        <div className="border-2 border-brand bg-cream p-4 md:p-6 shadow-[6px_6px_0_var(--color-brand)]">
          <div className="flex items-center justify-between gap-4 mb-6 md:mb-8 flex-wrap">
            <h2 id="how-sous-chef-works-heading" className="font-[family-name:var(--font-press-start)] text-sm md:text-2xl leading-[1.5]">
              How Sous-Chef Works
            </h2>
            <p className="font-[family-name:var(--font-geist-sans)] text-sm md:text-base text-brand/75">
              Automate releases. Save time. Serve your audience.
            </p>
          </div>

          <div
            className={paused ? "group/flow is-paused relative" : "group/flow relative"}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            <div aria-hidden className="absolute left-0 right-0 top-7 hidden lg:block border-t-2 border-dashed border-brand/40" />
            <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5" aria-label="Five-step Sous-Chef workflow">
              {STEPS.map((step, idx) => (
                <li
                  key={step.id}
                  className="relative border-2 border-brand bg-white p-4 min-h-44 shadow-[4px_4px_0_var(--color-brand)] animate-flow-step motion-reduce:animate-none"
                  style={{ animationDelay: `${idx * 0.9}s`, animationPlayState: paused ? "paused" : "running" }}
                >
                  <div className="mb-3 inline-flex items-center justify-center border-2 border-brand bg-gold w-8 h-8 font-[family-name:var(--font-press-start)] text-[10px]">
                    {step.id}
                  </div>
                  <h3 className="font-[family-name:var(--font-press-start)] text-[11px] md:text-xs uppercase mb-2">{step.title}</h3>
                  <p className="font-[family-name:var(--font-geist-sans)] text-sm leading-snug text-brand/85">{step.body}</p>
                  <div className="mt-4 border-2 border-brand bg-surface inline-block px-2 py-1 font-[family-name:var(--font-geist-mono)] text-[10px] uppercase">
                    {step.badge}
                  </div>
                </li>
              ))}
            </ol>

            <div
              aria-hidden
              className="hidden lg:block absolute top-[22px] h-4 w-4 border-2 border-brand bg-gold animate-flow-dot motion-reduce:animate-none"
              style={{ animationPlayState: paused ? "paused" : "running" }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
