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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {templates.map((t) => {
        const isSelected = selectedId === t.id;

        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onSelect(t.id, t.config)}
            className={`
              text-left border-2 bg-white p-3 transition-all
              focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold
              ${isSelected
                ? "border-gold shadow-[4px_4px_0_var(--color-gold)]"
                : "border-brand shadow-[4px_4px_0_var(--color-brand)] hover:shadow-[2px_2px_0_var(--color-brand)]"
              }
            `}
          >
            {/* Thumbnail */}
            <div className="aspect-video w-full mb-2 overflow-hidden border border-brand/10 bg-surface">
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

            <p className="font-[family-name:var(--font-press-start)] text-[10px] text-brand leading-tight">
              {t.name}
            </p>
            {t.isDefault && (
              <span className="text-[8px] font-[family-name:var(--font-geist-sans)] text-brand/40 mt-0.5 block">
                default
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
