"use client";

import Link from "next/link";
import { TemplateCardBase } from "@/components/shared/template-card-base";
import { TemplatePreview } from "@/components/kitchen/template-preview";
import { buildSampleBrand } from "@/lib/preview-sample";
import type { TemplateMedium } from "@/lib/templates/canvas-defaults";
import type { CanvasTemplateConfig } from "@/lib/templates/canvas-types";

export interface PublicTemplateCardProps {
  externalId: string;
  name: string;
  medium: TemplateMedium;
  previewUrl?: string;
  palette: { background: string; text: string; primary: string };
  config?: CanvasTemplateConfig | null;
  className?: string;
}

export function PublicTemplateCard({
  externalId,
  name,
  medium,
  previewUrl,
  palette,
  config,
  className = "",
}: PublicTemplateCardProps) {
  const thumbnail = config ? (
    <TemplatePreview
      config={config}
      brand={buildSampleBrand(config)}
      format="landscape"
    />
  ) : previewUrl ? (
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

  return (
    <Link
      href={`/templates/${externalId}`}
      aria-label={`View ${name} template`}
      className="block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold transition-transform hover:-translate-y-0.5"
    >
      <TemplateCardBase
        name={name}
        medium={medium}
        thumbnail={thumbnail}
        className={className}
      />
    </Link>
  );
}
