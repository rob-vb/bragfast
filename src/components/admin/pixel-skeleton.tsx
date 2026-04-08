import { cn } from "@/lib/utils";

interface PixelSkeletonProps {
  className?: string;
}

/** Dashed-border animated placeholder matching pixel-art aesthetic */
export function PixelSkeleton({ className }: PixelSkeletonProps) {
  return (
    <div
      className={cn(
        "border-2 border-dashed border-brand/30 bg-surface animate-pixel-skeleton",
        className
      )}
    />
  );
}

/** Skeleton for a stat card */
export function PixelSkeletonCard() {
  return (
    <div className="border-2 border-brand bg-white p-4 shadow-[4px_4px_0_var(--color-brand)]">
      <PixelSkeleton className="h-8 w-16 mb-2" />
      <PixelSkeleton className="h-3 w-24" />
    </div>
  );
}

/** Skeleton for a table row */
export function PixelSkeletonRow() {
  return (
    <div className="flex gap-4 px-4 py-3 border-b border-brand/10">
      <PixelSkeleton className="h-4 w-24" />
      <PixelSkeleton className="h-4 w-16" />
      <PixelSkeleton className="h-4 w-12" />
      <PixelSkeleton className="h-4 w-20" />
    </div>
  );
}

/** Skeleton for the credit meter */
export function PixelSkeletonMeter() {
  return (
    <div className="border-2 border-brand bg-white p-5 shadow-[4px_4px_0_var(--color-brand)]">
      <div className="flex items-center justify-between mb-3">
        <PixelSkeleton className="h-4 w-32" />
        <PixelSkeleton className="h-4 w-20" />
      </div>
      <PixelSkeleton className="h-6 w-full" />
    </div>
  );
}
