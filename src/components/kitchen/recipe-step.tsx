"use client";

import { useMemo } from "react";
import { PixelEmptyState } from "@/components/admin/pixel-empty-state";
import type { CanvasTemplateConfig } from "@/lib/templates/canvas-types";
import type { Brand } from "@/lib/types";
import { buildBragfastSampleBrand } from "@/lib/preview-sample";
import { TemplatePreview } from "@/components/kitchen/template-preview";

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
  /** User's primary brand — used for custom template previews.
   *  Defaults to brag.fast sample brand when absent (e.g. new accounts). */
  userBrand?: Brand;
}

export function RecipeStep({
  templates,
  selectedId,
  onSelect,
  userBrand,
}: RecipeStepProps) {
  const bragfastBrand = useMemo(() => buildBragfastSampleBrand(), []);

  if (templates.length === 0) {
    return (
      <PixelEmptyState
        title="No templates"
        description="No templates available yet."
        cta={{ label: "Go to Templates", href: "/admin/kitchen?tab=templates" }}
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* Template picker */}
      <div className="space-y-2">
        <p className="font-[family-name:var(--font-press-start)] text-[10px] text-brand/60 uppercase">
          Template
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {templates.map((t) => {
            const isSelected = selectedId === t.id;
            // Defaults always preview with brag.fast branding.
            // Custom templates use the user's own brand if available; fallback to brag.fast
            // so previews never crash on new accounts with no brands yet.
            const previewBrand = t.isDefault ? bragfastBrand : (userBrand ?? bragfastBrand);

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
                  <TemplatePreview config={t.config} brand={previewBrand} />
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
      </div>
    </div>
  );
}
