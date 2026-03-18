import { PixelSkeletonRow } from "@/components/dashboard/pixel-skeleton";

export default function HistoryLoading() {
  return (
    <div className="space-y-6">
      <div className="h-6 w-24 border-2 border-dashed border-brand/30 bg-surface animate-pixel-skeleton" />
      <div className="border-2 border-brand bg-white shadow-[4px_4px_0_var(--color-brand)]">
        <div className="border-b-2 border-brand bg-gold/20 px-4 py-3">
          <div className="h-3 w-48 border-2 border-dashed border-brand/30 bg-surface animate-pixel-skeleton" />
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <PixelSkeletonRow key={i} />
        ))}
      </div>
    </div>
  );
}
