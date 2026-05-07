import type { TemplateMedium } from "@/lib/templates/canvas-defaults";

const LABELS: Record<TemplateMedium, string> = {
  image: "Image",
  video: "Video",
  both: "Image + Video",
};

export function MediumPill({
  medium,
  className = "",
}: {
  medium: TemplateMedium;
  className?: string;
}) {
  return (
    <span
      className={`inline-block border-2 border-brand px-2 py-0.5 font-[family-name:var(--font-press-start)] text-[10px] bg-cream text-brand ${className}`}
      data-medium={medium}
    >
      {LABELS[medium]}
    </span>
  );
}
