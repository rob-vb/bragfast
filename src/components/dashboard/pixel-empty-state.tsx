import Link from "next/link";

interface PixelEmptyStateProps {
  title: string;
  description: string;
  cta: {
    label: string;
    href: string;
  };
  secondaryCta?: {
    label: string;
    href: string;
  };
}

/** CSS-based pixel art icon — a simple grid of colored blocks */
function PixelArtIcon() {
  // 5x5 pixel art grid — abstract "sparkle/star" pattern
  const grid = [
    [0, 0, 1, 0, 0],
    [0, 1, 0, 1, 0],
    [1, 0, 1, 0, 1],
    [0, 1, 0, 1, 0],
    [0, 0, 1, 0, 0],
  ];

  return (
    <div className="inline-grid grid-cols-5 gap-[3px] mb-4">
      {grid.flat().map((filled, i) => (
        <div
          key={i}
          className={`h-3 w-3 ${
            filled ? "bg-gold border border-brand/20" : "bg-transparent"
          }`}
        />
      ))}
    </div>
  );
}

export function PixelEmptyState({
  title,
  description,
  cta,
  secondaryCta,
}: PixelEmptyStateProps) {
  return (
    <div className="border-2 border-brand bg-white p-8 shadow-[4px_4px_0_var(--color-brand)] text-center">
      <PixelArtIcon />
      <h3 className="font-[family-name:var(--font-press-start)] text-xs text-brand mb-2">
        {title}
      </h3>
      <p className="font-[family-name:var(--font-geist-sans)] text-sm text-brand/60 mb-6 max-w-sm mx-auto">
        {description}
      </p>
      <div className="flex items-center justify-center gap-3">
        <Link
          href={cta.href}
          className="inline-block font-[family-name:var(--font-press-start)] text-[10px] px-4 py-3 border-2 border-brand bg-gold text-brand shadow-[3px_3px_0_var(--color-brand)] hover:shadow-[1px_1px_0_var(--color-brand)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
        >
          {cta.label}
        </Link>
        {secondaryCta && (
          <Link
            href={secondaryCta.href}
            className="inline-block font-[family-name:var(--font-press-start)] text-[10px] px-4 py-3 border-2 border-brand bg-transparent text-brand hover:bg-gold/20 transition-all"
          >
            {secondaryCta.label}
          </Link>
        )}
      </div>
    </div>
  );
}
