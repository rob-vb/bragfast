export default function DraftsLoading() {
  return (
    <div className="space-y-6">
      <div className="h-6 w-24 border-2 border-dashed border-brand/30 bg-surface animate-pixel-skeleton" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-40 border-2 border-dashed border-brand/30 bg-surface animate-pixel-skeleton"
          />
        ))}
      </div>
    </div>
  );
}
