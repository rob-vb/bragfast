"use client";

import { useState } from "react";
import { PixelEmptyState } from "@/components/admin/pixel-empty-state";
import type { CanvasTemplateConfig } from "@/lib/templates/canvas-types";
import type { Brand } from "@/lib/types";
import { buildBragfastSampleBrand } from "@/lib/preview-sample";
import { TemplatePreview } from "@/components/kitchen/template-preview";
import { TemplatePickerDialog } from "@/components/kitchen/template-picker-dialog";

const BRAGFAST_BRAND = buildBragfastSampleBrand();

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
  const [pickerOpen, setPickerOpen] = useState(false);

  if (templates.length === 0) {
    return (
      <PixelEmptyState
        title="No templates"
        description="No templates available yet."
        cta={{ label: "Go to Templates", href: "/admin/templates" }}
      />
    );
  }

  const selected = templates.find((t) => t.id === selectedId) ?? null;
  const previewBrand = selected
    ? selected.isDefault
      ? BRAGFAST_BRAND
      : userBrand ?? BRAGFAST_BRAND
    : BRAGFAST_BRAND;

  return (
    <div className="space-y-2">
      {selected ? (
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          aria-label={`Change template (currently ${selected.name})`}
          className="
            block w-full text-left bg-white p-2 transition-all
            border-[3px] border-brand shadow-[3px_3px_0_var(--color-gold)]
            hover:shadow-[1px_1px_0_var(--color-gold)]
            focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold
          "
        >
          <div className="aspect-video w-full mb-2 overflow-hidden border border-brand/10 bg-surface">
            <TemplatePreview config={selected.config} brand={previewBrand} />
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="font-[family-name:var(--font-press-start)] text-[10px] text-brand leading-tight truncate">
                {selected.name}
              </p>
              {selected.isDefault && (
                <span className="text-[7px] font-[family-name:var(--font-geist-sans)] text-brand/40 block">
                  default
                </span>
              )}
            </div>
            <span
              aria-hidden
              className="font-[family-name:var(--font-press-start)] text-[9px] text-brand/70 px-2 py-1 border-2 border-brand/30 bg-surface flex-shrink-0"
            >
              ▸ Change
            </span>
          </div>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="
            w-full min-h-[120px] flex items-center justify-center
            font-[family-name:var(--font-press-start)] text-[10px] text-brand
            border-2 border-dashed border-brand/40 bg-white
            hover:border-brand hover:bg-gold/20 transition-colors
            focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold
          "
        >
          ▸ Choose Template
        </button>
      )}

      <TemplatePickerDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        templates={templates}
        selectedId={selectedId}
        onSelect={onSelect}
      />
    </div>
  );
}
