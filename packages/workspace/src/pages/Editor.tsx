import { useMemo, useState } from "react";
import type { CanvasTemplateConfig, FormatKey } from "@bragfast/render-core/browser";
import { TemplatePreview } from "../components/TemplatePreview";
import { FormatSwitcher } from "../components/FormatSwitcher";
import { BrandPicker } from "../components/BrandPicker";
import { SlotPanel } from "../components/SlotPanel";
import { SavedIndicator } from "../components/SavedIndicator";
import { useAutoSave } from "../hooks/useAutoSave";
import { useBrand } from "../hooks/useBrand";
import { buildDraftObjectData } from "../lib/buildDraftObjectData";
import type { Brand, DraftConfig } from "../types";

interface EditorProps {
  draftId: string | null;
  templateId: string;
  templateConfig: CanvasTemplateConfig;
  initialConfig: DraftConfig;
  initialBrand: Brand;
  initiallyDirty?: boolean;
  onBack: () => void;
}

export function Editor({
  draftId,
  templateId,
  templateConfig,
  initialConfig,
  initialBrand,
  initiallyDirty = false,
  onBack,
}: EditorProps) {
  const [config, setConfig] = useState<DraftConfig>({
    ...initialConfig,
    templateId,
    colors: initialConfig.colors ?? initialBrand.colors ?? templateConfig.colors,
    format: initialConfig.format ?? "landscape",
  });
  const [dirty, setDirty] = useState(initiallyDirty);
  const [brandId, setBrandId] = useState(config.brandId);
  const { brands, selectedBrand, selectedBrandId } = useBrand({
    templateColors: templateConfig.colors,
    selectedBrandId: brandId,
  });
  const save = useAutoSave({ draftId, config: dirty ? config : null });
  const activeFormat = config.format ?? "landscape";

  const previewBrand = useMemo<Brand>(() => ({
    ...(selectedBrand.name ? selectedBrand : initialBrand),
    colors: config.colors ?? selectedBrand.colors ?? templateConfig.colors,
  }), [config.colors, initialBrand, selectedBrand, templateConfig.colors]);

  const objectData = useMemo(
    () => buildDraftObjectData(templateConfig, config.objectContent, activeFormat, {
      placeholderForEmpty: true,
    }),
    [activeFormat, config.objectContent, templateConfig],
  );

  function updateConfig(next: DraftConfig) {
    setConfig(next);
    setDirty(true);
  }

  return (
    <main className="min-h-screen bg-[var(--workspace-bg)] px-4 py-5 text-[var(--workspace-ink)] sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <section className="min-w-0">
          <div className="mb-4 flex flex-col gap-3 border-b border-[var(--workspace-border)] pb-4 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={onBack}
              className="w-fit text-[12px] font-semibold text-[var(--workspace-forest)] underline decoration-[var(--workspace-lime)] underline-offset-4"
            >
              Start from template
            </button>
            <SavedIndicator status={save.status} />
          </div>

          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <FormatSwitcher
              value={activeFormat}
              onChange={(format: FormatKey) => updateConfig({ ...config, format })}
            />
          </div>

          <div className="overflow-hidden rounded-[8px] border border-[var(--workspace-border)] bg-white">
            <TemplatePreview
              config={templateConfig}
              brand={previewBrand}
              format={activeFormat}
              objectData={objectData}
            />
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <BrandPicker
            brands={brands}
            brandId={selectedBrandId}
            colors={config.colors ?? templateConfig.colors}
            onBrandChange={(nextBrandId, colors) => {
              setBrandId(nextBrandId);
              updateConfig({ ...config, brandId: nextBrandId, colors });
            }}
            onColorsChange={(colors) => updateConfig({ ...config, colors })}
          />
          <SlotPanel
            templateConfig={templateConfig}
            format={activeFormat}
            config={config}
            brandLogoUrl={previewBrand.logoBase64}
            onConfigChange={updateConfig}
          />
        </section>
      </div>
    </main>
  );
}
