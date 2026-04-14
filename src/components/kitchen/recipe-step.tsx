"use client";

import { PixelEmptyState } from "@/components/admin/pixel-empty-state";
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
  outputType: "image" | "video";
  onSelect: (id: string, config: CanvasTemplateConfig) => void;
  onOutputTypeChange: (type: "image" | "video") => void;
}

export function RecipeStep({
  templates,
  selectedId,
  outputType,
  onSelect,
  onOutputTypeChange,
}: RecipeStepProps) {
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
      {/* Output type — image vs video frames the entire flow */}
      <div className="space-y-2">
        <p className="font-[family-name:var(--font-press-start)] text-[10px] text-brand/60 uppercase">
          Output
        </p>
        <div className="inline-flex border-2 border-brand">
          {(["image", "video"] as const).map((type) => {
            const active = outputType === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => onOutputTypeChange(type)}
                className={`
                  font-[family-name:var(--font-press-start)] text-[10px] px-4 py-2 capitalize
                  transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold
                  ${active ? "bg-gold text-brand" : "bg-white text-brand/50 hover:text-brand hover:bg-gold/20"}
                `}
              >
                {type}
              </button>
            );
          })}
        </div>
      </div>

      {/* Template picker */}
      <div className="space-y-2">
        <p className="font-[family-name:var(--font-press-start)] text-[10px] text-brand/60 uppercase">
          Template
        </p>
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
                <div className="w-full h-full border-2 border-dashed border-brand/20 flex items-center justify-center">
                  <span className="font-[family-name:var(--font-press-start)] text-[7px] text-brand/30">
                    No preview
                  </span>
                </div>
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
      </div>
    </div>
  );
}
