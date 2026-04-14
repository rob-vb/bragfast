import { PixelSkeletonCard } from "@/components/admin/pixel-skeleton";

export default function KitchenLoading() {
  return (
    <div className="space-y-6">
      <div className="h-6 w-28 border-2 border-dashed border-brand/30 bg-surface animate-pixel-skeleton" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <PixelSkeletonCard />
        <PixelSkeletonCard />
        <PixelSkeletonCard />
        <PixelSkeletonCard />
        <PixelSkeletonCard />
      </div>
    </div>
  );
}
