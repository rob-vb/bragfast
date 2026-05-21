import { useEffect, useMemo, useState } from "react";
import {
  CANVAS_DEFAULTS,
  type CanvasTemplateConfig,
} from "@bragfast/render-core/browser";
import { fetchDrafts } from "../api";
import { TemplatePreview } from "../components/TemplatePreview";
import { useBrand } from "../hooks/useBrand";
import type { Brand, DraftPreview } from "../types";

const TEMPLATE_IDS = [
  "standard-browser",
  "standard-mobile",
  "split-browser",
  "split-mobile",
  "hero",
] as const;

const FALLBACK_COLORS = {
  background: "#F7F6F2",
  text: "#1A1A1A",
  primary: "#1F3D3A",
};

export interface HomeProps {
  onReopenDraft: (draftId: string) => void;
  onNewTemplate: (templateId: string, config: CanvasTemplateConfig, brand: Brand) => void;
}

export function Home({ onReopenDraft, onNewTemplate }: HomeProps) {
  const [drafts, setDrafts] = useState<DraftPreview[]>([]);
  const [loadingDrafts, setLoadingDrafts] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const templates = useMemo(
    () => TEMPLATE_IDS.map((id) => ({ id, ...CANVAS_DEFAULTS[id] })),
    [],
  );
  const { selectedBrand } = useBrand({ templateColors: templates[0]?.config.colors ?? FALLBACK_COLORS });

  useEffect(() => {
    let cancelled = false;
    setLoadingDrafts(true);
    fetchDrafts()
      .then((rows) => {
        if (cancelled) return;
        setDrafts(rows);
        setLoadError(false);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      })
      .finally(() => {
        if (!cancelled) setLoadingDrafts(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="min-h-screen bg-[var(--workspace-bg)] px-4 py-6 text-[var(--workspace-ink)] sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <header className="flex flex-col gap-3 border-b border-[var(--workspace-border)] pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-semibold uppercase tracking-[0.08em] text-[12px] text-[var(--workspace-sage)]">
              brag.fast Workspace
            </p>
            <h1 className="mt-2 font-semibold text-[24px] leading-[1.25] text-[var(--workspace-forest)]">
              Start from template
            </h1>
          </div>
          <div className="rounded-[8px] border border-[var(--workspace-border)] bg-[var(--workspace-surface)] px-3 py-2 text-[12px] font-semibold text-[var(--workspace-muted)]">
            Local drafts, local media, ready for render.
          </div>
        </header>

        {loadError ? (
          <div className="border border-red-200 bg-white px-4 py-3 text-[14px] text-red-700">
            Could not load the Workspace. Check that the local brag server is still running, then refresh.
          </div>
        ) : null}

        <div className="grid gap-8 lg:grid-cols-[minmax(280px,0.85fr)_minmax(0,1.55fr)]">
          <section aria-labelledby="recent-drafts-title" className="flex flex-col gap-4">
            <div>
              <h2 id="recent-drafts-title" className="font-semibold text-[18px] leading-[1.3]">
                Recent drafts
              </h2>
              <p className="mt-1 text-[14px] leading-[1.5] text-[var(--workspace-muted)]">
                Resume a local draft without changing its saved media or caption.
              </p>
            </div>

            <div className="min-h-[260px] rounded-[8px] border border-[var(--workspace-border)] bg-[var(--workspace-surface)]">
              {loadingDrafts ? (
                <p className="p-4 text-[14px] text-[var(--workspace-muted)]">Loading draft...</p>
              ) : drafts.length === 0 ? (
                <div className="flex min-h-[260px] flex-col justify-center p-5">
                  <h3 className="font-semibold text-[18px] leading-[1.3]">No drafts yet</h3>
                  <p className="mt-2 text-[14px] leading-[1.5] text-[var(--workspace-muted)]">
                    Pick a template to start your first local draft.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-[var(--workspace-border)]">
                  {drafts.map((draft) => (
                    <article key={draft.id} className="grid grid-cols-[72px_1fr] gap-3 p-3">
                      <div className="aspect-square rounded-[6px] bg-[var(--workspace-bg)]" />
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold text-[14px] leading-[1.35]">
                          {draft.name ?? draft.preview.title}
                        </h3>
                        <p className="mt-1 text-[12px] text-[var(--workspace-muted)]">
                          {new Date(draft.created_at).toLocaleDateString()}
                        </p>
                        <button
                          type="button"
                          className="mt-3 min-h-[36px] rounded-[6px] bg-[var(--workspace-forest)] px-3 text-[12px] font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--workspace-lime)]"
                          onClick={() => onReopenDraft(draft.id)}
                        >
                          Reopen draft
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section aria-labelledby="templates-title" className="flex flex-col gap-4">
            <div>
              <h2 id="templates-title" className="font-semibold text-[18px] leading-[1.3]">
                Start from template
              </h2>
              <p className="mt-1 text-[14px] leading-[1.5] text-[var(--workspace-muted)]">
                Choose a live preview. Your first content edit creates the draft.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {templates.map((template) => (
                <article
                  key={template.id}
                  className="overflow-hidden rounded-[8px] border border-[var(--workspace-border)] bg-[var(--workspace-surface)]"
                >
                  <div className="aspect-video border-b border-[var(--workspace-border)] bg-[var(--workspace-bg)]">
                    <TemplatePreview
                      config={template.config}
                      brand={selectedBrand}
                      format="landscape"
                    />
                  </div>
                  <div className="p-3">
                    <h3 className="font-semibold text-[14px] leading-[1.35]">{template.name}</h3>
                    <button
                      type="button"
                      className="mt-3 min-h-[40px] w-full rounded-[6px] border border-[var(--workspace-forest)] bg-[var(--workspace-forest)] px-3 text-[12px] font-semibold text-white transition-colors hover:bg-[#294b47] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--workspace-lime)]"
                      onClick={() => onNewTemplate(template.id, template.config, selectedBrand)}
                      aria-label={`Use template ${template.name}`}
                    >
                      Use template
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
