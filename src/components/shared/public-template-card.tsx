"use client";

import Link from "next/link";
import { TemplateCardBase } from "@/components/shared/template-card-base";
import type { TemplateMedium } from "@/lib/templates/canvas-defaults";

export interface PublicTemplateCardProps {
  externalId: string;
  name: string;
  isDefault: boolean;
  medium: TemplateMedium;
  previewUrl?: string;
  palette: { background: string; text: string; primary: string };
  className?: string;
}

export function PublicTemplateCard({
  externalId,
  name,
  isDefault,
  medium,
  previewUrl,
  palette,
  className = "",
}: PublicTemplateCardProps) {
  const thumbnail = previewUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={previewUrl}
      alt={`${name} preview`}
      className="absolute inset-0 w-full h-full object-cover"
      loading="lazy"
    />
  ) : (
    <div
      className="absolute inset-0 flex items-center justify-center"
      style={{ background: palette.background }}
    >
      <span
        className="font-[family-name:var(--font-press-start)] text-xs"
        style={{ color: palette.text }}
      >
        {name}
      </span>
    </div>
  );

  const actions = (
    <Link
      href={`/templates/${externalId}`}
      className="border-2 border-brand bg-gold px-3 py-1 font-[family-name:var(--font-press-start)] text-[10px] text-brand shadow-[2px_2px_0_var(--color-brand)] hover:translate-y-[1px] hover:shadow-[1px_1px_0_var(--color-brand)]"
    >
      View
    </Link>
  );

  return (
    <TemplateCardBase
      name={name}
      medium={medium}
      isDefault={isDefault}
      thumbnail={thumbnail}
      actions={actions}
      className={className}
    />
  );
}
