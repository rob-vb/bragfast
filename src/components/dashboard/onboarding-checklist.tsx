import Link from "next/link";

interface OnboardingChecklistProps {
  hasBrands: boolean;
  hasReleases: boolean;
  onDismiss?: boolean; // if true, show as dismissed (hidden)
}

export function OnboardingChecklist({
  hasBrands,
  hasReleases,
  onDismiss,
}: OnboardingChecklistProps) {
  if (onDismiss) return null;
  // Only show when user has done nothing yet
  if (hasBrands || hasReleases) return null;

  const steps = [
    {
      done: hasBrands,
      label: "Create your brand",
      href: "/dashboard/brands/new",
    },
    {
      done: false, // templates are always available, this is about picking one
      label: "Pick a template",
      href: "/dashboard/templates",
    },
    {
      done: hasReleases,
      label: "Generate your first image",
      href: "/docs",
    },
  ];

  return (
    <div className="border-[3px] border-brand bg-white shadow-[6px_6px_0_var(--color-brand)] overflow-hidden">
      {/* NES-style header bar */}
      <div className="bg-brand text-gold px-4 py-3">
        <h2 className="font-[family-name:var(--font-press-start)] text-xs">
          &#9654; Getting Started
        </h2>
      </div>

      <div className="p-5 space-y-3">
        <p className="font-[family-name:var(--font-geist-sans)] text-sm text-brand/70 mb-4">
          Welcome to brag.fast! Here&apos;s how to get cooking:
        </p>

        {steps.map((step) => (
          <Link
            key={step.label}
            href={step.href}
            className="flex items-center gap-3 px-3 py-2.5 border-2 border-brand/20 hover:border-brand hover:bg-gold/10 transition-all group"
          >
            <span
              className={`flex-shrink-0 h-5 w-5 border-2 border-brand flex items-center justify-center text-[10px] ${
                step.done ? "bg-gold" : "bg-white"
              }`}
            >
              {step.done ? "+" : ""}
            </span>
            <span className="font-[family-name:var(--font-press-start)] text-[10px] text-brand group-hover:text-brand/80">
              {step.label}
            </span>
            <span className="ml-auto font-[family-name:var(--font-press-start)] text-[10px] text-brand/30 group-hover:text-brand/50">
              &rarr;
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
