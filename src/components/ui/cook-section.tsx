"use client";

import { useState } from "react";

interface CookSectionProps {
  title: React.ReactNode;
  locked?: boolean;
  defaultOpen?: boolean;
  /** Controlled open state (for accordion mode) */
  isOpen?: boolean;
  /** Called when the section is toggled */
  onToggle?: (open: boolean) => void;
  children: React.ReactNode;
}

export function CookSection({
  title,
  locked = false,
  defaultOpen = false,
  isOpen: controlledOpen,
  onToggle,
  children,
}: CookSectionProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;

  function toggle() {
    if (locked) return;
    const next = !open;
    if (controlledOpen === undefined) setInternalOpen(next);
    onToggle?.(next);
  }

  return (
    <div className={`border-b-2 border-brand/10 ${locked ? "opacity-40 pointer-events-none" : ""}`}>
      <button
        type="button"
        className="w-full flex items-center justify-between py-4 px-1 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
        onClick={toggle}
        aria-expanded={open}
        disabled={locked}
      >
        <span className="font-[family-name:var(--font-press-start)] text-xs text-brand">
          {title}
        </span>
        <span
          className="font-[family-name:var(--font-press-start)] text-xs text-brand transition-transform duration-200"
          aria-hidden="true"
        >
          {open ? "▾" : "▸"}
        </span>
      </button>

      <div
        className={`overflow-hidden transition-all duration-200 ${open ? "max-h-[2000px] pb-4" : "max-h-0"}`}
      >
        {children}
      </div>
    </div>
  );
}
