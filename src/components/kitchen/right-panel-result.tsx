"use client";

import { useState } from "react";
import type { ReleaseResult } from "@/lib/types";
import type { FormatKey } from "@/lib/templates/canvas-types";

const FORMAT_LABELS: Record<FormatKey, string> = {
  landscape: "Landscape",
  square: "Square",
  portrait: "Portrait",
};

interface RightPanelResultProps {
  result: ReleaseResult;
  initialFormat?: FormatKey;
  onSend: () => void;
  sendEnabled: boolean;
}

export function RightPanelResult({
  result,
  initialFormat,
  onSend,
  sendEnabled,
}: RightPanelResultProps) {
  const isVideo = result.output === "video";
  const renderedKeys = (
    isVideo
      ? Object.keys(result.videos ?? {})
      : Object.keys(result.images ?? {})
  ) as FormatKey[];

  const seed: FormatKey = renderedKeys.includes(initialFormat as FormatKey)
    ? (initialFormat as FormatKey)
    : (renderedKeys[0] ?? "landscape");
  const [active, setActive] = useState<FormatKey>(seed);

  const videoEntry = isVideo ? result.videos?.[active] : null;
  const imageUrl = !isVideo ? result.images?.[active]?.slides?.[0] ?? null : null;
  const downloadUrl = isVideo ? videoEntry?.url : imageUrl;

  return (
    <div className="flex flex-col h-full">
      {/* Tabs — canonical order, with disabled state for un-rendered formats */}
      <div role="tablist" className="flex border-b-2 border-brand/10 px-4 pt-3 gap-1">
        {(["landscape", "square", "portrait"] as const).map((fmt) => {
          const enabled = renderedKeys.includes(fmt);
          const isActive = enabled && fmt === active;
          return (
            <button
              key={fmt}
              role="tab"
              aria-selected={isActive}
              aria-disabled={!enabled}
              type="button"
              onClick={() => enabled && setActive(fmt)}
              tabIndex={enabled ? 0 : -1}
              className={`
                font-[family-name:var(--font-press-start)] text-[10px] px-4 min-h-[40px]
                border-2 -mb-[2px]
                focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold
                transition-colors
                ${isActive
                  ? "bg-gold text-brand border-brand shadow-[2px_2px_0_var(--color-brand)]"
                  : enabled
                    ? "bg-white text-brand/70 border-brand/30 hover:bg-gold/20 hover:text-brand"
                    : "bg-transparent text-brand/25 border-brand/10 cursor-not-allowed"
                }
              `}
            >
              {FORMAT_LABELS[fmt]}
            </button>
          );
        })}
      </div>

      {/* Canvas */}
      <div role="tabpanel" className="flex-1 p-4 bg-surface flex items-center justify-center overflow-hidden">
        {isVideo && videoEntry ? (
          <video
            key={videoEntry.url}
            src={videoEntry.url}
            controls
            className="max-w-full max-h-full object-contain border-2 border-brand/10"
          />
        ) : imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={`${active} result`}
            className="max-w-full max-h-full object-contain border-2 border-brand/10"
          />
        ) : (
          <p className="font-[family-name:var(--font-geist-sans)] text-xs text-brand/50">
            No output for this format
          </p>
        )}
      </div>

      {/* Result announcement (off-screen-ish, only for screen readers) */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        Order up! Your {isVideo ? "videos" : "images"} are ready.
      </div>

      {/* Actions */}
      <div className="border-t-2 border-brand/10 px-4 py-3 flex flex-wrap items-center gap-2">
        {downloadUrl && (
          <a
            href={downloadUrl}
            download
            target="_blank"
            rel="noreferrer"
            className="font-[family-name:var(--font-press-start)] text-[10px] px-3 py-2 border-2 border-brand bg-white text-brand hover:bg-gold/20 shadow-[3px_3px_0_var(--color-brand)] hover:shadow-[1px_1px_0_var(--color-brand)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
          >
            Download
          </a>
        )}
        <a
          href={`/admin/history?id=${encodeURIComponent(result.cook_id)}`}
          className="font-[family-name:var(--font-press-start)] text-[10px] px-3 py-2 border-2 border-brand bg-white text-brand hover:bg-gold/20 shadow-[3px_3px_0_var(--color-brand)] hover:shadow-[1px_1px_0_var(--color-brand)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
        >
          View in History
        </a>
        {sendEnabled && (
          <button
            type="button"
            onClick={onSend}
            className="ml-auto font-[family-name:var(--font-press-start)] text-[10px] px-3 py-2 border-2 border-brand bg-gold text-brand shadow-[3px_3px_0_var(--color-brand)] hover:shadow-[1px_1px_0_var(--color-brand)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
          >
            Send
          </button>
        )}
      </div>
    </div>
  );
}
