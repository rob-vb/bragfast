const statusStyles = {
  completed: "bg-green-400 text-brand",
  pending: "bg-yellow-300 text-brand",
  failed: "bg-red-400 text-white",
};

export function PixelBadge({
  status,
}: {
  status: "completed" | "pending" | "failed";
}) {
  return (
    <span
      className={`inline-block border-2 border-brand px-2 py-0.5 font-[family-name:var(--font-press-start)] text-[10px] ${statusStyles[status]}`}
    >
      {status}
    </span>
  );
}
