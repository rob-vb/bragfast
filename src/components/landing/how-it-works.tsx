const STEPS = [
  {
    number: "1",
    title: "Ship a feature",
    description: "Push code, tag a release, or describe what you built.",
  },
  {
    number: "2",
    title: "Generate images",
    description: "brag.fast creates branded images in every format.",
  },
  {
    number: "3",
    title: "Post everywhere",
    description: "Download or auto-post to X, LinkedIn, wherever.",
  },
];

export function HowItWorks() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6 max-w-4xl mx-auto">
      {STEPS.map((step, i) => (
        <div key={step.number} className="flex flex-col items-center text-center gap-3">
          <div className="flex items-center gap-3 md:flex-col md:gap-3">
            {/* Number badge */}
            <div className="h-10 w-10 flex items-center justify-center bg-gold border-2 border-brand shadow-[2px_2px_0_var(--color-brand)]">
              <span className="font-[family-name:var(--font-press-start)] text-sm text-brand">
                {step.number}
              </span>
            </div>
            {/* Arrow (desktop only, not after last) */}
            {i < STEPS.length - 1 && (
              <span className="hidden md:block absolute translate-x-[calc(100%+1rem)] font-[family-name:var(--font-press-start)] text-brand/20 text-lg" style={{ position: "relative", translate: "none" }}>
              </span>
            )}
          </div>
          <h3 className="font-[family-name:var(--font-press-start)] text-[11px] text-brand">
            {step.title}
          </h3>
          <p className="font-[family-name:var(--font-geist-sans)] text-sm text-brand/60 leading-relaxed max-w-[240px]">
            {step.description}
          </p>
        </div>
      ))}
    </div>
  );
}
