export default function BriefingLoading() {
  return (
    <div className="space-y-6">
      <div className="h-6 w-32 border-2 border-dashed border-brand/30 bg-surface animate-pixel-skeleton" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-72 border-2 border-dashed border-brand/30 bg-surface animate-pixel-skeleton"
          />
        ))}
      </div>
    </div>
  );
}
