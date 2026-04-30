"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useUserId } from "@/hooks/use-user-id";
import type { DraftConfig } from "@/lib/drafts/types";
import type { FormatKey } from "@/lib/templates/canvas-types";
import { FORMAT_DIMENSIONS } from "@/lib/templates/canvas-types";
import { derivePreviewTitle } from "@/lib/drafts/preview";
import { DraftPreview } from "./draft-preview";
import { DraftPreviewBoundary } from "./draft-preview-boundary";

type DraftRow = {
  id: string;
  name: string | null;
  source: "agent" | "user";
  sourceSystem: string | null;
  config: string;
  confidence: number | null;
  suppressed: boolean;
  created_at: string;
};

const VALID_FORMATS: FormatKey[] = ["landscape", "square", "portrait"];

function parseConfig(raw: string): DraftConfig {
  try {
    return JSON.parse(raw) as DraftConfig;
  } catch {
    return { output: "image" };
  }
}

function primaryFormat(config: DraftConfig): FormatKey {
  const formats = config.formats ?? [];
  if (formats.includes("landscape")) return "landscape";
  const first = formats.find((f): f is FormatKey =>
    VALID_FORMATS.includes(f as FormatKey),
  );
  return first ?? "landscape";
}

function firstDescriptionLine(config: DraftConfig): string | null {
  const obj = config.objectContent;
  if (!obj) return null;
  for (const c of Object.values(obj)) {
    const text = c?.text;
    if (text && typeof text === "string") {
      const first = text.split(/\n/)[0]?.trim();
      if (first) return first;
    }
  }
  return null;
}

export function RetroDraftHero() {
  const userId = useUserId();
  const router = useRouter();
  const drafts = useQuery(api.drafts.listByUser, { userId }) as
    | DraftRow[]
    | undefined;
  const [skipping, setSkipping] = useState(false);

  const target = useMemo(() => {
    if (!drafts) return null;
    return (
      drafts.find(
        (d) => d.source === "agent" && d.sourceSystem === "github" && !d.suppressed,
      ) ?? null
    );
  }, [drafts]);

  if (!drafts || !target) return null;

  const config = parseConfig(target.config);
  const title = derivePreviewTitle(config, target.name);
  const desc = firstDescriptionLine(config);
  const fmt = primaryFormat(config);
  const dims = FORMAT_DIMENSIONS[fmt];
  const confidence = target.confidence;

  async function onSkip() {
    if (!target) return;
    setSkipping(true);
    try {
      await fetch(`/api/v1/drafts/${target.id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setSkipping(false);
    }
  }

  function onEdit() {
    if (!target) return;
    router.push(`/admin/kitchen?draft=${encodeURIComponent(target.id)}`);
  }

  function onApprove() {
    if (!target) return;
    router.push(`/admin/kitchen?draft=${encodeURIComponent(target.id)}&approve=1`);
  }

  return (
    <div className="border-[3px] border-brand bg-white shadow-[6px_6px_0_var(--color-brand)]">
      <div className="bg-brand text-gold px-5 py-3 font-mono text-xs uppercase tracking-widest">
        ▸ Your first brag post is ready
      </div>
      <div className="p-5 sm:p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,300px)_1fr] gap-6 items-start">
          <div
            className="border-2 border-brand bg-surface overflow-hidden"
            style={{ aspectRatio: `${dims.width} / ${dims.height}` }}
          >
            <DraftPreviewBoundary
              key={target.id}
              fallback={<div className="p-4 text-xs text-brand/60">{title}</div>}
            >
              <DraftPreview config={config} />
            </DraftPreviewBoundary>
          </div>

          <div className="space-y-3 min-w-0">
            <h2 className="font-[family-name:var(--font-press-start)] text-sm text-brand leading-relaxed">
              {title}
            </h2>
            {desc && (
              <p className="text-sm text-brand/70 leading-relaxed line-clamp-2">
                {desc}
              </p>
            )}
            {confidence != null && (
              <p className="font-mono text-[11px] text-brand/60 uppercase tracking-widest">
                Confidence · {confidence.toFixed(2)}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={onApprove}
            className="flex-1 bg-gold text-brand border-2 border-brand px-4 py-3 font-mono text-xs uppercase tracking-widest font-bold shadow-[3px_3px_0_var(--color-brand)] transition-all hover:shadow-[2px_2px_0_var(--color-brand)] hover:translate-x-[1px] hover:translate-y-[1px] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
          >
            ▸ Approve
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="flex-1 bg-white text-brand border-2 border-brand px-4 py-3 font-mono text-xs uppercase tracking-widest font-bold shadow-[3px_3px_0_var(--color-brand)] transition-all hover:shadow-[2px_2px_0_var(--color-brand)] hover:translate-x-[1px] hover:translate-y-[1px]"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={onSkip}
            disabled={skipping}
            className="flex-1 bg-surface text-brand border-2 border-brand px-4 py-3 font-mono text-xs uppercase tracking-widest font-bold shadow-[3px_3px_0_var(--color-brand)] transition-all hover:shadow-[2px_2px_0_var(--color-brand)] hover:translate-x-[1px] hover:translate-y-[1px] disabled:opacity-50"
          >
            {skipping ? "Skipping…" : "Skip"}
          </button>
        </div>
      </div>
    </div>
  );
}
