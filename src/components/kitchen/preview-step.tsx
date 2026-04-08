"use client";

import { useState } from "react";
import { PixelButton } from "@/components/admin/pixel-button";
import { PixelSkeleton } from "@/components/admin/pixel-skeleton";
import type { FormatKey } from "@/lib/templates/canvas-types";

const FORMAT_TABS: FormatKey[] = ["landscape", "square", "portrait"];

interface PreviewStepProps {
  templateId: string;
  selectedFormats: FormatKey[];
  onLoadingChange?: (loading: boolean) => void;
}

export function PreviewStep({ templateId, selectedFormats, onLoadingChange }: PreviewStepProps) {
  const [activeFormat, setActiveFormat] = useState<FormatKey>("landscape");
  const [previewUrls, setPreviewUrls] = useState<Partial<Record<FormatKey, string>>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setLoadingState(value: boolean) {
    setLoading(value);
    onLoadingChange?.(value);
  }

  async function fetchPreview(format: FormatKey) {
    setLoadingState(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/templates/${templateId}/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format }),
      });
      if (!res.ok) throw new Error("Preview failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setPreviewUrls((prev) => ({ ...prev, [format]: url }));
    } catch {
      setError("Preview unavailable. You can still cook!");
    } finally {
      setLoadingState(false);
    }
  }

  async function handlePreviewAll() {
    const formats = selectedFormats.length > 0 ? selectedFormats : ["landscape" as FormatKey];
    setLoadingState(true);
    setError(null);
    setPreviewUrls({});
    try {
      await Promise.all(
        formats.map(async (fmt) => {
          const res = await fetch(`/api/v1/templates/${templateId}/preview`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ format: fmt }),
          });
          if (!res.ok) throw new Error("Preview failed");
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          setPreviewUrls((prev) => ({ ...prev, [fmt]: url }));
        })
      );
    } catch {
      setError("Preview unavailable. You can still cook!");
    } finally {
      setLoadingState(false);
    }
  }

  const visibleFormats = FORMAT_TABS.filter((f) =>
    selectedFormats.length === 0 ? f === "landscape" : selectedFormats.includes(f)
  );
  const currentUrl = previewUrls[activeFormat];
  const hasAnyPreview = Object.keys(previewUrls).length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <PixelButton
          onClick={handlePreviewAll}
          disabled={loading}
          variant="ghost"
          className="text-[10px]"
        >
          {loading ? "Rendering..." : hasAnyPreview ? "Re-preview" : "Preview"}
        </PixelButton>
        {loading && (
          <span className="text-xs font-[family-name:var(--font-geist-sans)] text-brand/50 animate-pulse">
            Rendering with Satori...
          </span>
        )}
      </div>

      {error && (
        <p className="text-xs font-[family-name:var(--font-geist-sans)] text-brand/60">
          {error}
        </p>
      )}

      {(hasAnyPreview || loading) && (
        <div className="space-y-3">
          {/* Format tabs */}
          {visibleFormats.length > 1 && (
            <div className="flex gap-0 border-2 border-brand inline-flex">
              {visibleFormats.map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => {
                    setActiveFormat(fmt);
                    if (!previewUrls[fmt] && !loading) fetchPreview(fmt);
                  }}
                  className={`
                    font-[family-name:var(--font-press-start)] text-[10px] px-3 py-1.5 capitalize
                    transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold
                    ${activeFormat === fmt ? "bg-gold text-brand" : "bg-white text-brand/50 hover:bg-gold/20"}
                  `}
                >
                  {fmt}
                </button>
              ))}
            </div>
          )}

          {/* Preview image */}
          <div className="border-2 border-brand shadow-[4px_4px_0_var(--color-brand)] overflow-hidden">
            {loading && !currentUrl ? (
              <PixelSkeleton className="w-full aspect-video" />
            ) : currentUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentUrl}
                alt={`${activeFormat} preview`}
                className="w-full h-auto object-contain max-w-[600px] mx-auto block"
              />
            ) : (
              <div className="w-full aspect-video flex items-center justify-center bg-surface">
                <span className="text-xs font-[family-name:var(--font-geist-sans)] text-brand/40">
                  Click Preview to render
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {!hasAnyPreview && !loading && !error && (
        <p className="text-xs font-[family-name:var(--font-geist-sans)] text-brand/50">
          Click Preview to see a server-rendered JPEG of your template.
        </p>
      )}
    </div>
  );
}
