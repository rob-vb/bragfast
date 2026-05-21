import type {
  CanvasTemplateConfig,
  FormatKey,
  TemplateObject,
} from "@bragfast/render-core/browser";
import type { DraftConfig, DraftObjectContent } from "../types";
import { CaptionField } from "./CaptionField";
import { VisualField } from "./VisualField";

interface SlotPanelProps {
  templateConfig: CanvasTemplateConfig;
  format: FormatKey;
  config: DraftConfig;
  brandLogoUrl?: string;
  onConfigChange: (config: DraftConfig) => void;
}

function fieldLabel(object: TemplateObject): string {
  return object.name.charAt(0).toUpperCase() + object.name.slice(1);
}

export function SlotPanel({
  templateConfig,
  format,
  config,
  brandLogoUrl,
  onConfigChange,
}: SlotPanelProps) {
  const objects = templateConfig.formats[format]?.objects ?? templateConfig.formats.landscape.objects;
  const textObjects = objects.filter((object) => object.type === "text");
  const mediaObjects = objects.filter((object) => object.type === "visual" || object.type === "logo");

  function updateObject(objectId: string, value: DraftObjectContent) {
    onConfigChange({
      ...config,
      objectContent: {
        ...(config.objectContent ?? {}),
        [objectId]: value,
      },
    });
  }

  return (
    <aside className="flex flex-col gap-5 rounded-[8px] border border-[var(--workspace-border)] bg-[var(--workspace-surface)] p-4">
      <div>
        <h2 className="text-[18px] font-semibold leading-[1.3] text-[var(--workspace-forest)]">
          Slots
        </h2>
        <p className="mt-1 text-[14px] leading-[1.5] text-[var(--workspace-muted)]">
          Fill the canvas fields and post copy.
        </p>
      </div>

      <div className="grid gap-4">
        {textObjects.map((object) => {
          const current = config.objectContent?.[object.id]?.text ?? "";
          const label = fieldLabel(object);
          const isLong = object.height > 100 || object.name.toLowerCase().includes("desc");
          return (
            <div key={object.id} className="space-y-2">
              <label htmlFor={`slot-${object.id}`} className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--workspace-sage)]">
                {label}
              </label>
              {isLong ? (
                <textarea
                  id={`slot-${object.id}`}
                  value={current}
                  rows={3}
                  placeholder={object.previewText ?? `Enter ${label}`}
                  onChange={(event) =>
                    updateObject(object.id, {
                      ...(config.objectContent?.[object.id] ?? {}),
                      text: event.target.value,
                    })
                  }
                  className="w-full resize-none rounded-[6px] border border-[var(--workspace-border)] bg-white px-3 py-2 text-[14px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--workspace-lime)]"
                />
              ) : (
                <input
                  id={`slot-${object.id}`}
                  value={current}
                  placeholder={object.previewText ?? `Enter ${label}`}
                  onChange={(event) =>
                    updateObject(object.id, {
                      ...(config.objectContent?.[object.id] ?? {}),
                      text: event.target.value,
                    })
                  }
                  className="min-h-[40px] w-full rounded-[6px] border border-[var(--workspace-border)] bg-white px-3 text-[14px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--workspace-lime)]"
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="grid gap-4">
        {mediaObjects.map((object) => (
          <VisualField
            key={object.id}
            label={fieldLabel(object)}
            value={config.objectContent?.[object.id] ?? {}}
            brandLogoUrl={object.type === "logo" ? brandLogoUrl : undefined}
            onChange={(value) => updateObject(object.id, value)}
          />
        ))}
      </div>

      <CaptionField
        value={config.caption ?? ""}
        onChange={(caption) => onConfigChange({ ...config, caption })}
      />
    </aside>
  );
}
