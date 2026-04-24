"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { DraftConfig } from "@/lib/drafts/types";
import type { CanvasTemplateConfig, FormatKey } from "@/lib/templates/canvas-types";
import { FORMAT_DIMENSIONS, migrateConfig } from "@/lib/templates/canvas-types";
import { getCanvasDefaultConfig } from "@/lib/templates/canvas-defaults";
import { buildDraftObjectData, buildBragfastSampleBrand } from "@/lib/preview-sample";
import type { Brand } from "@/lib/types";
import { TemplatePreview } from "@/components/kitchen/template-preview";
import { MotionPreview } from "@/components/editor/motion-preview";

interface DraftPreviewProps {
  config: DraftConfig;
}

function pickInitialFormat(available: FormatKey[]): FormatKey {
  if (available.includes("landscape")) return "landscape";
  return available[0];
}

function brandFromRecord(
  record: { name: string; logo_url?: string; website?: string; font_family?: string; colors: { background: string; text: string; primary: string } },
): Brand {
  return {
    name: record.name,
    logoBase64: record.logo_url ?? "",
    website: record.website ?? "",
    font_family: record.font_family,
    colors: record.colors,
  };
}

export function DraftPreview({ config }: DraftPreviewProps) {
  const templateId = config.templateId;
  const isCustomTemplate = !!templateId && templateId.startsWith("tmpl_");
  const brandId = config.brandId;

  // G1: Unconditional useQuery calls with "skip" sentinel to keep hook order stable.
  const customTemplate = useQuery(
    api.templates.getByExternalId,
    isCustomTemplate && templateId ? { externalId: templateId } : "skip",
  );
  const brandRecord = useQuery(
    api.brands.getByExternalId,
    brandId ? { externalId: brandId } : "skip",
  );

  // Available formats (D6): empty-array guard.
  const availableFormats: FormatKey[] =
    config.formats && config.formats.length > 0 ? config.formats : ["landscape"];
  const activeFormat = pickInitialFormat(availableFormats);

  const rawTemplate: CanvasTemplateConfig | null = useMemo(() => {
    if (isCustomTemplate) {
      if (customTemplate === undefined) return null; // still loading
      if (customTemplate === null) {
        // G1: deleted custom template → fall back to standard-browser.
        return getCanvasDefaultConfig("standard-browser");
      }
      return (customTemplate.config ?? null) as CanvasTemplateConfig | null;
    }
    // Default/built-in or omitted.
    return (
      getCanvasDefaultConfig(templateId ?? "standard-browser") ??
      getCanvasDefaultConfig("standard-browser")
    );
  }, [isCustomTemplate, customTemplate, templateId]);

  const templateConfig = useMemo(
    () => (rawTemplate ? migrateConfig(rawTemplate) : null),
    [rawTemplate],
  );

  const brandLoading = !!brandId && brandRecord === undefined;

  const brand: Brand = useMemo(() => {
    if (!brandId) return buildBragfastSampleBrand();
    if (brandRecord === undefined) return buildBragfastSampleBrand(); // not rendered (brandLoading guard below)
    if (brandRecord === null) return buildBragfastSampleBrand();
    return brandFromRecord(brandRecord);
  }, [brandId, brandRecord]);

  const objectData = useMemo(() => {
    if (!templateConfig) return null;
    return buildDraftObjectData(templateConfig, config.objectContent, activeFormat);
  }, [templateConfig, config.objectContent, activeFormat]);

  const dims = FORMAT_DIMENSIONS[activeFormat];
  const aspectStyle: React.CSSProperties = {
    aspectRatio: `${dims.width} / ${dims.height}`,
  };

  if (!templateConfig || !objectData || brandLoading) {
    return (
      <div
        className="border-2 border-dashed border-brand/30 bg-surface animate-pixel-skeleton"
        style={aspectStyle}
      />
    );
  }

  if (config.output === "video") {
    return (
      <div className="border-2 border-brand overflow-hidden" style={aspectStyle}>
        <MotionPreview
          config={templateConfig}
          brand={brand}
          format={activeFormat}
          presetOverride={config.video?.preset}
          durationOverride={config.video?.duration}
          slides={[objectData]}
        />
      </div>
    );
  }

  return (
    <div className="border-2 border-brand overflow-hidden bg-white" style={aspectStyle}>
      <TemplatePreview
        config={templateConfig}
        brand={brand}
        format={activeFormat}
        objectData={objectData}
      />
    </div>
  );
}
