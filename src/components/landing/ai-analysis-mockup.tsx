"use client";

import "./ai-analysis-mockup.css";

const LOOP = "10s infinite both";

export function AIAnalysisMockup() {
  return (
    <div aria-hidden="true" className="ai-analysis-mockup">
      <div className="border-2 border-brand bg-white shadow-[4px_4px_0_var(--color-brand)]">
        {/* Top bar */}
        <div className="border-b-2 border-brand px-3 py-1.5 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="block h-2 w-2 border border-brand bg-gold" />
            <span className="block h-2 w-2 border border-brand bg-surface" />
            <span className="block h-2 w-2 border border-brand bg-surface" />
          </div>
          <span className="font-[family-name:var(--font-press-start)] text-[8px] text-brand/50">
            Release Review
          </span>
          <span className="w-10" />
        </div>

        <div className="p-4 md:p-5 flex flex-col gap-3">
          {/* Release title */}
          <div style={{ animation: `ai-title ${LOOP}`, opacity: 0 }}>
            <span className="font-[family-name:var(--font-press-start)] text-sm md:text-base text-brand">
              v2.4.0
            </span>
          </div>

          {/* Category pills */}
          <div className="flex flex-wrap gap-2">
            <span
              className="font-[family-name:var(--font-press-start)] text-[7px] md:text-[8px] px-2 py-1 border-2 border-brand bg-gold"
              style={{ animation: `ai-pill-1 ${LOOP}`, opacity: 0 }}
            >
              3 New Features
            </span>
            <span
              className="font-[family-name:var(--font-press-start)] text-[7px] md:text-[8px] px-2 py-1 border-2 border-brand bg-white"
              style={{ animation: `ai-pill-2 ${LOOP}`, opacity: 0 }}
            >
              5 Bug Fixes
            </span>
            <span
              className="font-[family-name:var(--font-press-start)] text-[7px] md:text-[8px] px-2 py-1 border-2 border-brand bg-brand text-surface"
              style={{ animation: `ai-pill-3 ${LOOP}`, opacity: 0 }}
            >
              1 Breaking Change
            </span>
          </div>

          {/* AI summary */}
          <div
            className="border-t border-brand/10 pt-3"
            style={{ animation: `ai-summary ${LOOP}`, opacity: 0 }}
          >
            <p className="font-[family-name:var(--font-geist-sans)] text-xs md:text-sm text-brand/70 leading-relaxed">
              Adds dark mode, redesigned settings page, and bulk export. Fixes auth timeout and 5 UI bugs. Breaking: API v1 endpoints deprecated.
            </p>
          </div>

          {/* Action buttons */}
          <div
            className="flex gap-2 pt-1"
            style={{ animation: `ai-buttons ${LOOP}`, opacity: 0 }}
          >
            <span className="font-[family-name:var(--font-press-start)] text-[7px] md:text-[8px] px-3 py-1.5 border-2 border-brand bg-gold">
              Approve
            </span>
            <span className="font-[family-name:var(--font-press-start)] text-[7px] md:text-[8px] px-3 py-1.5 border-2 border-brand bg-white text-brand/60">
              Dismiss
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
