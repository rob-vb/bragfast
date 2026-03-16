const statusStyles: Record<string, string> = {
  completed: "bg-green-400 text-brand",
  pending: "bg-yellow-300 text-brand",
  failed: "bg-red-400 text-white",
  active: "bg-green-400 text-brand",
  suspended: "bg-orange-400 text-brand",
  removed: "bg-red-400 text-white",
  github: "bg-purple-400 text-white",
};

type Props =
  | { status: "completed" | "pending" | "failed"; label?: never; variant?: never }
  | { label: string; variant?: string; status?: never };

export function PixelBadge(props: Props) {
  const text = props.status ?? props.label ?? "";
  const style = statusStyles[props.status ?? props.variant ?? ""] ?? "bg-brand/20 text-brand";

  return (
    <span
      className={`inline-block border-2 border-brand px-2 py-0.5 font-[family-name:var(--font-press-start)] text-[10px] ${style}`}
    >
      {text}
    </span>
  );
}
