"use client"

import { useState, useEffect } from "react"
import type { ApiSection } from "@/lib/docs/types"
import { DocsSidebar } from "./docs-sidebar"

export function DocsSidebarMobile({ sections }: { sections: ApiSection[] }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [open])

  return (
    <>
      {/* Sticky mobile header */}
      <div className="sticky top-0 z-40 md:hidden flex items-center gap-3 bg-surface/90 backdrop-blur-sm border-b border-brand/10 px-4 py-3">
        <button
          onClick={() => setOpen(true)}
          className="p-1.5 -ml-1.5 text-brand/50 hover:text-brand hover:bg-gold/10 active:bg-gold/20 transition-colors"
          aria-label="Open navigation"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
            />
          </svg>
        </button>
        <span className="text-sm font-semibold text-brand">brag.fast</span>
        <span className="text-xs text-brand/50">API v1</span>
      </div>

      {/* Overlay */}
      <div
        className={`fixed inset-0 z-50 bg-black/25 transition-opacity duration-200 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setOpen(false)}
      />

      {/* Drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-surface shadow-[8px_0_0_var(--color-brand)] transition-transform duration-250 ease-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <button
          onClick={() => setOpen(false)}
          className="absolute top-5 right-3 p-1.5 text-brand/50 hover:text-brand hover:bg-gold/10 transition-colors"
          aria-label="Close navigation"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
        <div onClick={() => setOpen(false)}>
          <DocsSidebar sections={sections} />
        </div>
      </div>
    </>
  )
}
