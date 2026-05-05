const STEPS = [
  {
    title: "Connect",
    description: "Link GitHub and your data sources so Sous-Chef can spot meaningful wins.",
  },
  {
    title: "Watch",
    description: "Sous-Chef monitors merges, releases, and milestones in the background.",
  },
  {
    title: "Draft",
    description: "A daily brief and fresh post draft are prepared with your brand voice.",
  },
  {
    title: "Cook",
    description: "Open the kitchen, tune copy and visuals, then approve what ships.",
  },
  {
    title: "Serve",
    description: "Publish polished content to your channels and keep your audience warm.",
  },
] as const;

export function HowSousChefWorks() {
  return (
    <section className="py-16 md:py-24 bg-white border-b-2 border-brand overflow-hidden">
      <div className="mx-auto max-w-6xl px-4 md:px-10">
        <div className="flex flex-col gap-4 mb-10 md:mb-14">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-[3px] bg-gold" />
            <span className="font-[family-name:var(--font-press-start)] text-[8px] text-gold uppercase tracking-wider">
              How it works
            </span>
          </div>
          <h2 className="font-[family-name:var(--font-press-start)] text-base md:text-2xl leading-[1.4]">
            How Sous-Chef turns your shipping activity into posts
          </h2>
          <p className="font-[family-name:var(--font-geist-sans)] text-base md:text-lg text-brand/80 leading-relaxed max-w-3xl">
            A tiny courier runs the pipeline: connect your tools, watch for wins, auto-draft updates, polish in the kitchen, then serve everywhere.
          </p>
        </div>

        <div className="relative border-2 border-brand bg-surface p-4 md:p-6 shadow-[6px_6px_0_var(--color-brand)]">
          <div className="hidden md:block absolute left-10 right-10 top-[52px] h-1 border-y-2 border-brand bg-gold/35" />

          <div className="grid md:grid-cols-5 gap-4 md:gap-3 relative">
            {STEPS.map((step, idx) => (
              <div key={step.title} className="relative border-2 border-brand bg-white p-4 min-h-[170px]">
                <span className="inline-flex items-center justify-center w-8 h-8 border-2 border-brand bg-gold font-[family-name:var(--font-press-start)] text-[10px] mb-3">
                  {idx + 1}
                </span>
                <h3 className="font-[family-name:var(--font-press-start)] text-[10px] md:text-xs uppercase mb-2">
                  {step.title}
                </h3>
                <p className="font-[family-name:var(--font-geist-sans)] text-sm text-brand/80 leading-snug">
                  {step.description}
                </p>
              </div>
            ))}
          </div>

          <div
            aria-hidden
            className="hidden md:flex absolute top-[42px] left-10 w-[calc(100%-5rem)] items-center pointer-events-none animate-[flow-x_8s_linear_infinite]"
          >
            <div className="w-5 h-5 rounded-full border-2 border-brand bg-gold shadow-[2px_2px_0_var(--color-brand)]" />
            <div className="ml-2 font-[family-name:var(--font-press-start)] text-[8px] text-brand bg-cream border border-brand px-1.5 py-0.5">
              flow
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes flow-x {
          from {
            transform: translateX(0%);
          }
          to {
            transform: translateX(calc(100% - 72px));
          }
        }
      `}</style>
    </section>
  );
}
