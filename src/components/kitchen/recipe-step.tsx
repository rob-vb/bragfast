"use client";

import { PixelEmptyState } from "@/components/dashboard/pixel-empty-state";
import { PixelSkeleton } from "@/components/dashboard/pixel-skeleton";
import type { CanvasTemplateConfig } from "@/lib/templates/canvas-types";

export interface TemplateItem {
  id: string;
  displayId?: string;
  name: string;
  isDefault: boolean;
  previewUrl?: string;
  config: CanvasTemplateConfig;
}

interface RecipeStepProps {
  templates: TemplateItem[];
  selectedId: string | null;
  onSelect: (id: string, config: CanvasTemplateConfig) => void;
}

export function RecipeStep({ templates, selectedId, onSelect }: RecipeStepProps) {
  if (templates.length === 0) {
    return (
      <PixelEmptyState
        title="No templates"
        description="No templates available yet."
        cta={{ label: "Go to Templates", href: "/dashboard/kitchen?tab=templates" }}
      />
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
      {templates.map((t) => {
        const isSelected = selectedId === t.id;

        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onSelect(t.id, t.config)}
            className={`
              text-left border-2 bg-white p-2 transition-all
              focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold
              ${isSelected
                ? "border-gold shadow-[3px_3px_0_var(--color-gold)]"
                : "border-brand shadow-[2px_2px_0_var(--color-brand)] hover:shadow-[1px_1px_0_var(--color-brand)]"
              }
            `}
          >
            {/* Thumbnail */}
            <div className="aspect-video w-full mb-1 overflow-hidden border border-brand/10 bg-surface">
              {t.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={t.previewUrl}
                  alt={t.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <PixelSkeleton className="w-full h-full" />
              )}
            </div>

            <p className="font-[family-name:var(--font-press-start)] text-[8px] text-brand leading-tight truncate">
              {t.name}
            </p>
            {t.isDefault && (
              <span className="text-[7px] font-[family-name:var(--font-geist-sans)] text-brand/40 block">
                default
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
