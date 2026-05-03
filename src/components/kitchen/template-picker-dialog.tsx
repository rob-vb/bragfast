"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CanvasTemplateConfig } from "@/lib/templates/canvas-types";
import type { Brand } from "@/lib/types";
import { buildBragfastSampleBrand } from "@/lib/preview-sample";
import { TemplatePreview } from "@/components/kitchen/template-preview";
import type { TemplateItem } from "@/components/kitchen/recipe-step";

const BRAGFAST_BRAND = buildBragfastSampleBrand();

type TabKey = "defaults" | "custom";

interface TemplatePickerDialogProps {
  open: boolean;
  onClose: () => void;
  templates: TemplateItem[];
  selectedId: string | null;
  onSelect: (id: string, config: CanvasTemplateConfig) => void;
  userBrand?: Brand;
}

export function TemplatePickerDialog(props: TemplatePickerDialogProps) {
  // Only mount the body when open so internal state (tab, query) is fresh each open.
  if (!props.open) return null;
  return <DialogBody {...props} />;
}

function DialogBody({
  onClose,
  templates,
  selectedId,
  onSelect,
  userBrand,
}: TemplatePickerDialogProps) {
  const defaults = useMemo(() => templates.filter((t) => t.isDefault), [templates]);
  const customs = useMemo(() => templates.filter((t) => !t.isDefault), [templates]);
  const hasBoth = defaults.length > 0 && customs.length > 0;

  // Default tab: whichever group the current selection belongs to (or Defaults).
  const initialTab: TabKey = (() => {
    const sel = templates.find((t) => t.id === selectedId);
    return sel && !sel.isDefault ? "custom" : "defaults";
  })();

  const [tab, setTab] = useState<TabKey>(initialTab);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const visibleSource = !hasBoth ? templates : tab === "defaults" ? defaults : customs;
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return visibleSource;
    return visibleSource.filter((t) => t.name.toLowerCase().includes(q));
  }, [visibleSource, query]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-brand/40 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="template-picker-title"
    >
      <div
        className="w-full max-w-4xl max-h-[85vh] flex flex-col border-[3px] border-brand bg-white shadow-[6px_6px_0_var(--color-brand)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-brand text-gold px-4 py-3 flex items-center justify-between flex-shrink-0">
          <h2
            id="template-picker-title"
            className="font-[family-name:var(--font-press-start)] text-xs"
          >
            ▸ Choose Template
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="font-[family-name:var(--font-press-start)] text-[10px] text-gold hover:text-white"
            aria-label="Close"
          >
            X
          </button>
        </div>

        {/* Filters */}
        <div className="px-5 pt-4 pb-3 space-y-3 flex-shrink-0 border-b-2 border-brand/10">
          {hasBoth && (
            <div role="tablist" className="flex gap-1">
              {(
                [
                  { key: "defaults" as const, label: "Defaults", count: defaults.length },
                  { key: "custom" as const, label: "Custom", count: customs.length },
                ]
              ).map((t) => {
                const isActive = tab === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setTab(t.key)}
                    className={`
                      font-[family-name:var(--font-press-start)] text-[10px] px-4 min-h-[36px]
                      border-2 transition-colors
                      focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold
                      ${isActive
                        ? "bg-gold text-brand border-brand shadow-[2px_2px_0_var(--color-brand)]"
                        : "bg-white text-brand/70 border-brand/30 hover:bg-gold/20 hover:text-brand"
                      }
                    `}
                  >
                    {t.label} ({t.count})
                  </button>
                );
              })}
            </div>
          )}
          <input
            ref={searchRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search templates…"
            className="w-full border-2 border-brand bg-surface px-3 py-2 font-[family-name:var(--font-geist-sans)] text-sm text-brand focus:outline-2 focus:outline-offset-2 focus:outline-gold"
          />
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-5 bg-surface">
          {visible.length === 0 ? (
            <p className="font-[family-name:var(--font-geist-sans)] text-sm text-brand/50 text-center py-8">
              No templates match &ldquo;{query}&rdquo;.
            </p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {visible.map((t) => {
                const isSelected = selectedId === t.id;
                const previewBrand = t.isDefault
                  ? BRAGFAST_BRAND
                  : userBrand ?? BRAGFAST_BRAND;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      onSelect(t.id, t.config);
                      onClose();
                    }}
                    className={`
                      text-left bg-white p-2 transition-all
                      focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold
                      ${isSelected
                        ? "border-[3px] border-brand shadow-[3px_3px_0_var(--color-gold)]"
                        : "border-2 border-brand shadow-[2px_2px_0_var(--color-brand)] hover:shadow-[1px_1px_0_var(--color-brand)]"
                      }
                    `}
                  >
                    <div className="aspect-video w-full mb-2 overflow-hidden border border-brand/10 bg-surface">
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
          )}
        </div>
      </div>
    </div>
  );
}
