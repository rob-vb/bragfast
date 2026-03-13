"use client";

import "./editor-mockup.css";

const LOOP = "10s infinite both";

const objects = [
  { id: "logo", label: "logo" },
  { id: "title", label: "title" },
  { id: "description", label: "description" },
  { id: "image", label: "image" },
];

export function EditorMockup() {
  return (
    <div aria-hidden="true" className="editor-mockup">
      <div className="border-2 border-brand bg-white shadow-[4px_4px_0_var(--color-brand)]">
        {/* Top bar */}
        <div className="border-b-2 border-brand px-3 py-1.5 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="block h-2 w-2 border border-brand bg-gold" />
            <span className="block h-2 w-2 border border-brand bg-surface" />
            <span className="block h-2 w-2 border border-brand bg-surface" />
          </div>
          <span className="font-[family-name:var(--font-press-start)] text-[8px] text-brand/50">
            Template Editor
          </span>
          <span className="font-[family-name:var(--font-press-start)] text-[7px] text-brand/30 border border-brand/20 px-1.5 py-0.5">
            Save
          </span>
        </div>

        <div className="flex">
          {/* Left sidebar — object list */}
          <div className="w-[90px] md:w-[110px] border-r-2 border-brand p-2 flex flex-col gap-1 bg-surface/50">
            {/* Format tabs */}
            <div className="flex flex-col gap-0.5 mb-2">
              <div className="bg-brand text-surface font-[family-name:var(--font-press-start)] text-[6px] md:text-[7px] px-1.5 py-1 flex justify-between">
                <span>Landscape</span>
                <span className="text-surface/50">16:9</span>
              </div>
              <div className="text-brand/40 font-[family-name:var(--font-press-start)] text-[6px] md:text-[7px] px-1.5 py-0.5">
                Square
              </div>
              <div className="text-brand/40 font-[family-name:var(--font-press-start)] text-[6px] md:text-[7px] px-1.5 py-0.5">
                Portrait
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-brand/10 my-1" />

            {/* Objects label */}
            <span className="font-[family-name:var(--font-press-start)] text-[6px] text-brand/40 uppercase tracking-wider">
              Objects
            </span>

            {/* Object list */}
            {objects.map((obj) => (
              <div
                key={obj.id}
                className="font-[family-name:var(--font-geist-mono)] text-[8px] md:text-[9px] text-brand/70 px-1.5 py-1 border border-brand/10"
                style={{
                  animation: `highlight-${obj.id} ${LOOP}`,
                }}
              >
                {obj.label}
              </div>
            ))}
          </div>

          {/* Canvas */}
          <div className="flex-1 bg-surface/30 p-3 md:p-4 min-h-[180px] md:min-h-[220px] flex flex-col items-center justify-center gap-2">
            {/* Logo placeholder */}
            <div
              className="flex items-center gap-1"
              style={{ animation: `canvas-logo ${LOOP}`, opacity: 0 }}
            >
              <div className="w-4 h-4 md:w-5 md:h-5 border-2 border-brand/30 bg-gold/30" />
              <span className="font-[family-name:var(--font-press-start)] text-[7px] md:text-[8px] text-brand/40">
                brand
              </span>
            </div>

            {/* Title */}
            <div
              style={{ animation: `canvas-title ${LOOP}`, opacity: 0 }}
            >
              <span className="font-[family-name:var(--font-press-start)] text-sm md:text-base text-gold">
                FRESH NEW LOOK
              </span>
            </div>

            {/* Description */}
            <div
              style={{ animation: `canvas-title ${LOOP}`, opacity: 0 }}
            >
              <span className="font-[family-name:var(--font-geist-sans)] text-[9px] md:text-[10px] text-brand/50">
                We redesigned our website from the ground up
              </span>
            </div>

            {/* Image placeholder (browser frame) */}
            <div
              className="w-full max-w-[200px] md:max-w-[260px]"
              style={{ animation: `canvas-image ${LOOP}`, opacity: 0 }}
            >
              <div className="border-2 border-brand/20 bg-white">
                <div className="border-b border-brand/10 px-1.5 py-0.5 flex items-center gap-1">
                  <span className="block h-1 w-1 bg-gold/50 border border-brand/10" />
                  <span className="block h-1 w-1 bg-brand/10" />
                  <span className="block h-1 w-1 bg-brand/10" />
                </div>
                <div className="bg-surface/50 h-[60px] md:h-[80px] flex items-center justify-center">
                  <span className="font-[family-name:var(--font-press-start)] text-[6px] text-brand/20">
                    screenshot.png
                  </span>
                </div>
              </div>
            </div>

            {/* Format badge */}
            <div
              className="flex gap-1 mt-1"
              style={{ animation: `format-pulse ${LOOP}`, opacity: 0 }}
            >
              {["16:9", "1:1", "4:5"].map((fmt) => (
                <span
                  key={fmt}
                  className="font-[family-name:var(--font-press-start)] text-[6px] text-brand/30 border border-brand/10 px-1 py-0.5"
                >
                  {fmt}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
