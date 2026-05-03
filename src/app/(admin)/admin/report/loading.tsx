export default function ReportLoading() {
  return (
    <div className="space-y-6">
      <div className="h-6 w-32 border-2 border-dashed border-brand/30 bg-surface animate-pixel-skeleton" />
      <div className="h-72 border-2 border-dashed border-brand/30 bg-surface animate-pixel-skeleton" />
    </div>
  );
}
