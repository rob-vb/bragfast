"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { FormatTabStrip, type FormatKey } from "@/components/shared/format-tab-strip";
import { MediumPill } from "@/components/shared/medium-pill";
import { TemplatePreview } from "@/components/kitchen/template-preview";
import { buildSampleBrand } from "@/lib/preview-sample";
import type { TemplateMedium } from "@/lib/templates/canvas-defaults";
import type { CanvasTemplateConfig } from "@/lib/templates/canvas-types";

type PublicTemplate = {
  externalId: string;
  name: string;
  isDefault: boolean;
  medium: TemplateMedium;
  formats: FormatKey[];
  previewUrls?: { landscape: string; square: string; portrait: string };
  palette: { background: string; text: string; primary: string };
  config?: unknown;
};

const FORMAT_DIMS: Record<FormatKey, { w: number; h: number; label: string }> = {
  landscape: { w: 1200, h: 675, label: "1200 × 675" },
  square: { w: 1080, h: 1080, label: "1080 × 1080" },
  portrait: { w: 1080, h: 1350, label: "1080 × 1350" },
};

export function TemplateDetailClient({ template }: { template: PublicTemplate }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [active, setActive] = useState<FormatKey>(template.formats[0] ?? "landscape");
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoFiredRef = useRef(false);

  // Auto-fire import on signup return: ?action=import lands here either from
  // the user clicking Import while logged out (we redirect through signup) or
  // from someone bookmarking the URL with the param. The signup callback URL
  // brings them straight here, so we attempt import once on mount.
  useEffect(() => {
    if (autoFiredRef.current) return;
    if (searchParams?.get("action") !== "import") return;
    if (template.isDefault) return;
    autoFiredRef.current = true;
    runImport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runImport() {
    setImporting(true);
    setError(null);
    try {
      const res = await fetch("/api/templates/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceExternalId: template.externalId }),
      });
      if (res.status === 401) {
        const next = `/templates/${template.externalId}?action=import`;
        router.push(`/signup?next=${encodeURIComponent(next)}`);
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Import failed");
      }
      router.push(`/admin/kitchen?imported=${template.externalId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
      setImporting(false);
    }
  }

  const previewUrl = template.previewUrls?.[active];
  const dims = FORMAT_DIMS[active];

  return (
    <section className="py-8 md:py-12">
      <div className="mx-auto max-w-6xl px-4 md:px-8">
        <Link
          href="/templates"
          className="inline-flex items-center gap-2 mb-6 font-[family-name:var(--font-press-start)] text-[10px] px-3 py-2 text-brand border-2 border-brand bg-white shadow-[3px_3px_0_var(--color-brand)] hover:shadow-[1px_1px_0_var(--color-brand)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
        >
          ← Library
        </Link>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 lg:gap-8">
          {/* Preview column */}
          <div>
            <h1 className="font-[family-name:var(--font-press-start)] text-base md:text-xl text-brand mb-3">
              {template.name}
            </h1>
            <div className="flex items-center gap-2 flex-wrap mb-6">
              <MediumPill medium={template.medium} />
            </div>

            <FormatTabStrip
              formats={template.formats.length > 0 ? template.formats : ["landscape"]}
              active={active}
              onChange={setActive}
              className="mb-4"
            />

            <div className="border-2 border-brand bg-white shadow-[4px_4px_0_var(--color-brand)]">
              <div className="border-b-2 border-brand px-3 py-1.5 flex items-center justify-between">
                <span className="font-[family-name:var(--font-press-start)] text-[8px] text-brand/60">
                  {active}
                </span>
                <span className="font-[family-name:var(--font-geist-mono)] text-[10px] text-brand/40">
                  {dims.label}
                </span>
              </div>
              <div
                className="relative w-full overflow-hidden"
                style={{ aspectRatio: `${dims.w} / ${dims.h}` }}
              >
                {template.config ? (
                  <div className="absolute inset-0">
                    <TemplatePreview
                      config={template.config as CanvasTemplateConfig}
                      brand={buildSampleBrand(template.config as CanvasTemplateConfig)}
                      format={active}
                    />
                  </div>
                ) : previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUrl}
                    alt={`${template.name} ${active} preview`}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ background: template.palette.background }}
                  >
                    <span
                      className="font-[family-name:var(--font-press-start)] text-xs"
                      style={{ color: template.palette.text }}
                    >
                      {template.name}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sticky right rail (desktop) — collapses to inline on mobile,
              actual sticky bottom bar comes after */}
          <aside className="hidden lg:block">
            <div className="sticky top-6 border-2 border-brand bg-white p-5 shadow-[4px_4px_0_var(--color-brand)] space-y-4">
              <ImportPanel
                template={template}
                importing={importing}
                error={error}
                onImport={runImport}
              />
            </div>
          </aside>
        </div>

        {/* Mobile sticky bottom bar */}
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-30 border-t-2 border-brand bg-white p-3 shadow-[0_-4px_0_var(--color-brand)]">
          <ImportPanel
            template={template}
            importing={importing}
            error={error}
            onImport={runImport}
            compact
          />
        </div>

        {/* Spacer so mobile content doesn't sit under the bottom bar */}
        <div className="h-24 lg:hidden" />

        <div className="mt-10 text-sm text-brand/60">
          <Link href="/templates" className="underline underline-offset-4 hover:text-brand">
            ← Back to library
          </Link>
        </div>
      </div>
    </section>
  );
}

function ImportPanel({
  template,
  importing,
  error,
  onImport,
  compact = false,
}: {
  template: PublicTemplate;
  importing: boolean;
  error: string | null;
  onImport: () => void;
  compact?: boolean;
}) {
  const ctaClass =
    "flex-1 lg:w-full text-center border-2 border-brand bg-gold px-4 py-3 font-[family-name:var(--font-press-start)] text-[10px] text-brand shadow-[3px_3px_0_var(--color-brand)] hover:shadow-[1px_1px_0_var(--color-brand)] hover:translate-x-[2px] hover:translate-y-[2px] disabled:opacity-50 disabled:cursor-not-allowed transition-all";

  return (
    <div className={compact ? "flex items-center justify-between gap-3" : "space-y-3"}>
      {!compact && (
        <p className="font-[family-name:var(--font-geist-sans)] text-sm text-brand">
          {template.isDefault
            ? "This is a built-in layout — already in every kitchen."
            : "Import this layout to your kitchen — one click, no card needed."}
        </p>
      )}
      {template.isDefault ? (
        <Link href="/admin/kitchen" className={ctaClass}>
          Open kitchen
        </Link>
      ) : (
        <button
          type="button"
          onClick={onImport}
          disabled={importing}
          className={ctaClass}
        >
          {importing ? "Importing…" : "Import to my kitchen"}
        </button>
      )}
      {!compact && (
        <p className="text-[10px] text-brand/50 font-[family-name:var(--font-geist-mono)]">
          ID: {template.externalId}
        </p>
      )}
      {error ? (
        <p
          role="alert"
          className="text-xs text-red-600 font-[family-name:var(--font-geist-sans)]"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

