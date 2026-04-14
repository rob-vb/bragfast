"use client";

export function CreditMeter({
  remaining,
  total,
  plan,
}: {
  remaining: number;
  total: number;
  plan: string;
}) {
  const segments = 20;
  const filled = Math.round((Math.min(remaining, total) / total) * segments);
  const pct = total > 0 ? Math.round((remaining / total) * 100) : 0;

  return (
    <div className="border-2 border-brand bg-white p-5 shadow-[4px_4px_0_var(--color-brand)]">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="font-[family-name:var(--font-press-start)] text-xs text-brand">
            Credits
          </h2>
          <p className="text-xs text-brand/60 mt-0.5">{plan} plan</p>
        </div>
        <span className="font-[family-name:var(--font-press-start)] text-sm text-brand">
          {remaining} / {total}
        </span>
      </div>

      {/* Segmented pixel-art progress bar */}
      <div className="flex gap-[3px]">
        {Array.from({ length: segments }).map((_, i) => (
          <div
            key={i}
            className={`h-6 flex-1 border border-brand/10 ${
              i < filled ? "bg-gold" : "bg-brand/10"
            }`}
          />
        ))}
      </div>

      <p className="text-right text-[10px] text-brand/50 mt-1.5 font-[family-name:var(--font-press-start)]">
        {pct}% remaining
      </p>
    </div>
  );
}
