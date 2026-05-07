"use client";

import type { ReactNode } from "react";
import { PixelCard } from "@/components/admin/pixel-card";
import { MediumPill } from "@/components/shared/medium-pill";
import type { TemplateMedium } from "@/lib/templates/canvas-defaults";

export interface TemplateCardBaseProps {
  name: string;
  medium: TemplateMedium;
  isDefault?: boolean;
  thumbnail: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  className?: string;
  href?: string;
  onCardClick?: () => void;
}

// Shared layout shell for both AdminTemplateCard and PublicTemplateCard.
// Slots: thumbnail (top), name + medium pill, optional meta, actions footer.
// The card body itself is non-interactive — make individual children clickable.
export function TemplateCardBase({
  name,
  medium,
  isDefault = false,
  thumbnail,
  meta,
  actions,
  className = "",
}: TemplateCardBaseProps) {
  return (
    <PixelCard className={`flex flex-col gap-3 ${className}`}>
      <div className="relative w-full aspect-[16/9] overflow-hidden border-2 border-brand bg-cream">
        {thumbnail}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-[family-name:var(--font-press-start)] text-xs text-brand truncate">
          {name}
        </span>
        <MediumPill medium={medium} />
        {isDefault && (
          <span className="inline-block border-2 border-brand px-2 py-0.5 font-[family-name:var(--font-press-start)] text-[10px] bg-gold text-brand">
            System
          </span>
        )}
      </div>

      {meta ? <div className="text-[10px] font-mono text-brand/80">{meta}</div> : null}

      {actions ? <div className="flex gap-2 flex-wrap">{actions}</div> : null}
    </PixelCard>
  );
}
