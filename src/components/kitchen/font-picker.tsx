"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FONT_CATALOG } from "@/lib/font-catalog";
import { injectGoogleFont } from "@/lib/client-fonts";

const DEFAULT_FONT = "Plus Jakarta Sans";

const WEIGHT_OPTIONS: { value: number; label: string }[] = [
  { value: 400, label: "Regular" },
  { value: 500, label: "Medium" },
  { value: 600, label: "Semibold" },
  { value: 700, label: "Bold" },
];

function weightLabel(weight: number): string {
  const opt = WEIGHT_OPTIONS.find((w) => w.value === weight);
  return opt?.label ?? String(weight);
}

interface FontPickerProps {
  /** Currently selected font (overrides template default). Undefined → use template default. */
  value?: string;
  weightValue?: number;
  /** Template-defined defaults to display when no override. */
  templateDefault?: string;
  templateDefaultWeight?: number;
  onChange: (family: string | undefined) => void;
  onWeightChange: (weight: number | undefined) => void;
}

export function FontPicker({
  value,
  weightValue,
  templateDefault,
  templateDefaultWeight,
  onChange,
  onWeightChange,
}: FontPickerProps) {
  const displayedFamily = value || templateDefault || DEFAULT_FONT;
  const displayedWeight = weightValue ?? templateDefaultWeight ?? 400;

  // Inject the displayed font/weight so the inline label renders in it.
  useEffect(() => {
    injectGoogleFont(displayedFamily);
  }, [displayedFamily]);

  return (
    <div className="flex items-center gap-2 text-[10px] font-[family-name:var(--font-geist-sans)]">
      <FamilyControl
        family={displayedFamily}
        usingOverride={!!value}
        templateDefault={templateDefault}
        onChange={onChange}
      />
      <span aria-hidden className="text-brand/20">·</span>
      <WeightControl
        weight={displayedWeight}
        family={displayedFamily}
        usingOverride={weightValue !== undefined}
        templateDefaultWeight={templateDefaultWeight}
        onChange={onWeightChange}
      />
    </div>
  );
}

// ─── Family ───────────────────────────────────────────────────────────────

interface FamilyControlProps {
  family: string;
  usingOverride: boolean;
  templateDefault?: string;
  onChange: (family: string | undefined) => void;
}

function FamilyControl({ family, usingOverride, templateDefault, onChange }: FamilyControlProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const result: { category: string; fonts: string[] }[] = [];
    for (const [category, fonts] of Object.entries(FONT_CATALOG)) {
      const filtered = q ? fonts.filter((f) => f.toLowerCase().includes(q)) : fonts;
      if (filtered.length > 0) result.push({ category, fonts: filtered });
    }
    return result;
  }, [query]);

  function handlePick(picked: string) {
    if (picked === templateDefault) {
      onChange(undefined);
    } else {
      onChange(picked);
    }
    setOpen(false);
    setQuery("");
  }

  return (
    <div ref={wrapperRef} className="relative max-w-[220px]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={`Font: ${family}${usingOverride ? "" : " (template default)"}`}
        className="
          flex items-center gap-1 px-1.5 py-0.5 max-w-full
          text-brand/70 hover:text-brand
          border border-transparent hover:border-brand/30
          focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold
        "
      >
        <span className="truncate" style={{ fontFamily: `"${family}", sans-serif` }}>
          {family}
        </span>
        <span aria-hidden className="text-brand/40 flex-shrink-0">▾</span>
      </button>

      {open && (
        <div
          role="listbox"
          className="
            absolute right-0 top-full z-50 mt-1 w-72 max-h-80
            border-2 border-brand bg-white shadow-[3px_3px_0_var(--color-brand)]
            flex flex-col
          "
        >
          <div className="p-2 border-b-2 border-brand/10 flex-shrink-0">
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search fonts…"
              className="
                w-full border-2 border-brand/30 px-2 py-1.5 text-xs
                font-[family-name:var(--font-geist-sans)] text-brand bg-white
                focus:outline-2 focus:outline-offset-2 focus:outline-gold focus:border-brand
              "
            />
          </div>
          <div className="overflow-y-auto flex-1">
            {groups.length === 0 ? (
              <p className="p-3 text-xs font-[family-name:var(--font-geist-sans)] text-brand/50 text-center">
                No fonts match &ldquo;{query}&rdquo;.
              </p>
            ) : (
              groups.map((g) => (
                <div key={g.category}>
                  <div className="px-3 pt-2 pb-1 font-[family-name:var(--font-press-start)] text-[8px] text-brand/50 uppercase">
                    {g.category}
                  </div>
                  {g.fonts.map((f) => (
                    <FontOption
                      key={f}
                      family={f}
                      active={f === family}
                      onPick={() => handlePick(f)}
                    />
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface FontOptionProps {
  family: string;
  active: boolean;
  onPick: () => void;
}

function FontOption({ family, active, onPick }: FontOptionProps) {
  useEffect(() => {
    injectGoogleFont(family);
  }, [family]);

  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      onClick={onPick}
      className={`
        block w-full text-left px-3 py-1.5 text-sm transition-colors
        ${active ? "bg-gold/30 text-brand" : "text-brand/80 hover:bg-gold/15"}
      `}
      style={{ fontFamily: `"${family}", sans-serif` }}
    >
      {family}
    </button>
  );
}

// ─── Weight ───────────────────────────────────────────────────────────────

interface WeightControlProps {
  weight: number;
  family: string;
  usingOverride: boolean;
  templateDefaultWeight?: number;
  onChange: (weight: number | undefined) => void;
}

function WeightControl({
  weight,
  family,
  usingOverride,
  templateDefaultWeight,
  onChange,
}: WeightControlProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  function handlePick(picked: number) {
    if (picked === templateDefaultWeight) {
      onChange(undefined);
    } else {
      onChange(picked);
    }
    setOpen(false);
  }

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={`Weight: ${weightLabel(weight)}${usingOverride ? "" : " (template default)"}`}
        className="
          flex items-center gap-1 px-1.5 py-0.5
          text-brand/70 hover:text-brand
          border border-transparent hover:border-brand/30
          focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold
        "
      >
        <span style={{ fontFamily: `"${family}", sans-serif`, fontWeight: weight }}>
          {weightLabel(weight)}
        </span>
        <span aria-hidden className="text-brand/40">▾</span>
      </button>
      {open && (
        <div
          role="listbox"
          className="
            absolute right-0 top-full z-50 mt-1 w-32
            border-2 border-brand bg-white shadow-[3px_3px_0_var(--color-brand)]
          "
        >
          {WEIGHT_OPTIONS.map((opt) => {
            const active = opt.value === weight;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => handlePick(opt.value)}
                className={`
                  block w-full text-left px-3 py-1.5 text-sm
                  ${active ? "bg-gold/30 text-brand" : "text-brand/80 hover:bg-gold/15"}
                `}
                style={{ fontFamily: `"${family}", sans-serif`, fontWeight: opt.value }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
