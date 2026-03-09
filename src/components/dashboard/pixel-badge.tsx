const statusStyles = {
  completed: "bg-green-400 text-[#4A3326]",
  pending: "bg-yellow-300 text-[#4A3326]",
  failed: "bg-red-400 text-white",
};

export function PixelBadge({
  status,
}: {
  status: "completed" | "pending" | "failed";
}) {
  return (
    <span
      className={`inline-block border-2 border-[#4A3326] px-2 py-0.5 font-[family-name:var(--font-press-start)] text-[10px] ${statusStyles[status]}`}
    >
      {status}
    </span>
  );
}
