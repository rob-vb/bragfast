import { PixelSkeletonCard } from "@/components/dashboard/pixel-skeleton";

export default function BrandsLoading() {
  return (
    <div className="space-y-6">
      <div className="h-6 w-24 border-2 border-dashed border-brand/30 bg-surface animate-pixel-skeleton" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <PixelSkeletonCard />
        <PixelSkeletonCard />
        <PixelSkeletonCard />
      </div>
    </div>
  );
}
